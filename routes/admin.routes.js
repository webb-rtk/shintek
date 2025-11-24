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

module.exports = router;
