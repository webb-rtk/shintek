/**
 * Admin routes for authentication and log viewing
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  validateCredentials,
  createSession,
  validateSession,
  destroySession
} = require('../middleware/admin.middleware');
const logger = require('../utils/logger.util');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'line-config.json');

// Serve login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin-login.html'));
});

// Serve admin dashboard
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin-dashboard.html'));
});

// Login API
router.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (validateCredentials(username, password)) {
    const token = createSession(username);
    logger.info('Admin login successful', { username });
    res.json({ success: true, token });
  } else {
    logger.warn('Admin login failed', { username });
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout API
router.post('/api/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) {
    destroySession(token);
    logger.info('Admin logged out');
  }
  res.json({ success: true });
});

// Validate session API
router.get('/api/validate', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token && validateSession(token)) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

// Get list of log files
router.get('/api/logs', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!fs.existsSync(LOG_DIR)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(LOG_DIR)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          isError: file.startsWith('error-')
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({ files });
  } catch (err) {
    logger.error('Error listing log files', { error: err.message });
    res.status(500).json({ error: 'Failed to list log files' });
  }
});

// Get content of a specific log file
router.get('/api/logs/:filename', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filename } = req.params;
  const { lines = 100, offset = 0 } = req.query;

  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(LOG_DIR, filename);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    const totalLines = allLines.length;

    // Get lines from the end (most recent first)
    const startIndex = Math.max(0, totalLines - parseInt(offset) - parseInt(lines));
    const endIndex = totalLines - parseInt(offset);
    const selectedLines = allLines.slice(startIndex, endIndex).reverse();

    res.json({
      filename,
      totalLines,
      offset: parseInt(offset),
      lines: selectedLines
    });
  } catch (err) {
    logger.error('Error reading log file', { filename, error: err.message });
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

// Download log file
router.get('/api/logs/:filename/download', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filename } = req.params;

  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(LOG_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Log file not found' });
  }

  res.download(filePath, filename);
});

// Get LINE configuration
router.get('/api/config', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Attempting to read config file from:', CONFIG_FILE);
    logger.info('Config file exists:', fs.existsSync(CONFIG_FILE));

    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Configuration file not found', path: CONFIG_FILE });
    }

    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    logger.info('Config data length:', configData.length);

    const config = JSON.parse(configData);
    logger.info('Config parsed successfully');

    logger.info('Admin retrieved LINE configuration');
    res.json({ config });
  } catch (err) {
    logger.error('Error reading configuration file', { error: err.message, stack: err.stack, configFile: CONFIG_FILE });
    res.status(500).json({ error: 'Failed to read configuration file', details: err.message });
  }
});

// Update LINE configuration
router.put('/api/config', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Configuration data is required' });
    }

    // Validate configuration structure
    if (!config.systemPrompt || !config.systemPrompt.user || !config.systemPrompt.model) {
      return res.status(400).json({ error: 'Invalid configuration structure: systemPrompt.user and systemPrompt.model are required' });
    }

    if (!config.geminiModel) {
      return res.status(400).json({ error: 'Invalid configuration structure: geminiModel is required' });
    }

    if (!config.stickerReplyText) {
      return res.status(400).json({ error: 'Invalid configuration structure: stickerReplyText is required' });
    }

    // Write configuration to file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

    logger.info('Admin updated LINE configuration');
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err) {
    logger.error('Error updating configuration file', { error: err.message });
    res.status(500).json({ error: 'Failed to update configuration file' });
  }
});

module.exports = router;
