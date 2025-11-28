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
const roleService = require('../services/role.service');

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

    // Validate configuration structure for multi-role format
    if (config.roles) {
      // New multi-role format
      if (!config.roles || typeof config.roles !== 'object') {
        return res.status(400).json({ error: 'Invalid configuration structure: roles must be an object' });
      }

      if (!config.defaultRole) {
        return res.status(400).json({ error: 'Invalid configuration structure: defaultRole is required' });
      }

      // Validate each role
      for (const [roleId, roleConfig] of Object.entries(config.roles)) {
        if (!roleConfig.systemPrompt || !roleConfig.systemPrompt.user || !roleConfig.systemPrompt.model) {
          return res.status(400).json({ error: `Invalid role ${roleId}: systemPrompt.user and systemPrompt.model are required` });
        }

        if (!roleConfig.geminiModel) {
          return res.status(400).json({ error: `Invalid role ${roleId}: geminiModel is required` });
        }

        if (!roleConfig.stickerReplyText) {
          return res.status(400).json({ error: `Invalid role ${roleId}: stickerReplyText is required` });
        }
      }
    } else {
      // Legacy single-role format (backward compatibility)
      if (!config.systemPrompt || !config.systemPrompt.user || !config.systemPrompt.model) {
        return res.status(400).json({ error: 'Invalid configuration structure: systemPrompt.user and systemPrompt.model are required' });
      }

      if (!config.geminiModel) {
        return res.status(400).json({ error: 'Invalid configuration structure: geminiModel is required' });
      }

      if (!config.stickerReplyText) {
        return res.status(400).json({ error: 'Invalid configuration structure: stickerReplyText is required' });
      }
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

// ==================== Role Management API ====================

// Get all roles
router.get('/api/roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const roles = roleService.listRoles();
    logger.info('Admin retrieved roles list');
    res.json({ roles });
  } catch (err) {
    logger.error('Error retrieving roles', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve roles' });
  }
});

// Get a specific role
router.get('/api/roles/:roleId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { roleId } = req.params;

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = roleService.getRoleConfig(roleId);
    logger.info('Admin retrieved role', { roleId });
    res.json({ role });
  } catch (err) {
    logger.error('Error retrieving role', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve role' });
  }
});

// Create a new role
router.post('/api/roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { roleId, roleConfig } = req.body;

    if (!roleId || !roleConfig) {
      return res.status(400).json({ error: 'roleId and roleConfig are required' });
    }

    // Validate role configuration
    if (!roleConfig.name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    if (!roleConfig.systemPrompt || !roleConfig.systemPrompt.user || !roleConfig.systemPrompt.model) {
      return res.status(400).json({ error: 'systemPrompt.user and systemPrompt.model are required' });
    }

    if (!roleConfig.geminiModel) {
      return res.status(400).json({ error: 'geminiModel is required' });
    }

    if (!roleConfig.stickerReplyText) {
      return res.status(400).json({ error: 'stickerReplyText is required' });
    }

    if (roleService.roleExists(roleId)) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    const success = roleService.createRole(roleId, roleConfig);

    if (success) {
      logger.info('Admin created new role', { roleId });
      res.json({ success: true, message: 'Role created successfully' });
    } else {
      res.status(500).json({ error: 'Failed to create role' });
    }
  } catch (err) {
    logger.error('Error creating role', { error: err.message });
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update an existing role
router.put('/api/roles/:roleId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { roleId } = req.params;
    const { roleConfig } = req.body;

    if (!roleConfig) {
      return res.status(400).json({ error: 'roleConfig is required' });
    }

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Validate role configuration
    if (!roleConfig.name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    if (!roleConfig.systemPrompt || !roleConfig.systemPrompt.user || !roleConfig.systemPrompt.model) {
      return res.status(400).json({ error: 'systemPrompt.user and systemPrompt.model are required' });
    }

    if (!roleConfig.geminiModel) {
      return res.status(400).json({ error: 'geminiModel is required' });
    }

    if (!roleConfig.stickerReplyText) {
      return res.status(400).json({ error: 'stickerReplyText is required' });
    }

    const success = roleService.updateRole(roleId, roleConfig);

    if (success) {
      logger.info('Admin updated role', { roleId });
      res.json({ success: true, message: 'Role updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update role' });
    }
  } catch (err) {
    logger.error('Error updating role', { error: err.message });
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete a role
router.delete('/api/roles/:roleId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { roleId } = req.params;

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const success = roleService.deleteRole(roleId);

    if (success) {
      logger.info('Admin deleted role', { roleId });
      res.json({ success: true, message: 'Role deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete role (cannot delete default role)' });
    }
  } catch (err) {
    logger.error('Error deleting role', { error: err.message });
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ==================== User/Group Role Mapping API ====================

// Get all user role mappings
router.get('/api/user-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const mappings = roleService.getUserRoleMappings();
    logger.info('Admin retrieved user role mappings');
    res.json({ mappings });
  } catch (err) {
    logger.error('Error retrieving user role mappings', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve user role mappings' });
  }
});

// Assign role to user
router.post('/api/user-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ error: 'userId and roleId are required' });
    }

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const success = roleService.setUserRole(userId, roleId);

    if (success) {
      logger.info('Admin assigned role to user', { userId, roleId });
      res.json({ success: true, message: 'User role assigned successfully' });
    } else {
      res.status(500).json({ error: 'Failed to assign user role' });
    }
  } catch (err) {
    logger.error('Error assigning user role', { error: err.message });
    res.status(500).json({ error: 'Failed to assign user role' });
  }
});

// Remove user role assignment
router.delete('/api/user-roles/:userId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId } = req.params;

    const success = roleService.removeUserRole(userId);

    if (success) {
      logger.info('Admin removed user role assignment', { userId });
      res.json({ success: true, message: 'User role assignment removed successfully' });
    } else {
      res.status(404).json({ error: 'User role assignment not found' });
    }
  } catch (err) {
    logger.error('Error removing user role assignment', { error: err.message });
    res.status(500).json({ error: 'Failed to remove user role assignment' });
  }
});

// Get all group role mappings
router.get('/api/group-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const mappings = roleService.getGroupRoleMappings();
    logger.info('Admin retrieved group role mappings');
    res.json({ mappings });
  } catch (err) {
    logger.error('Error retrieving group role mappings', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve group role mappings' });
  }
});

// Assign role to group
router.post('/api/group-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { groupId, roleId } = req.body;

    if (!groupId || !roleId) {
      return res.status(400).json({ error: 'groupId and roleId are required' });
    }

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const success = roleService.setGroupRole(groupId, roleId);

    if (success) {
      logger.info('Admin assigned role to group', { groupId, roleId });
      res.json({ success: true, message: 'Group role assigned successfully' });
    } else {
      res.status(500).json({ error: 'Failed to assign group role' });
    }
  } catch (err) {
    logger.error('Error assigning group role', { error: err.message });
    res.status(500).json({ error: 'Failed to assign group role' });
  }
});

// Remove group role assignment
router.delete('/api/group-roles/:groupId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { groupId } = req.params;

    const success = roleService.removeGroupRole(groupId);

    if (success) {
      logger.info('Admin removed group role assignment', { groupId });
      res.json({ success: true, message: 'Group role assignment removed successfully' });
    } else {
      res.status(404).json({ error: 'Group role assignment not found' });
    }
  } catch (err) {
    logger.error('Error removing group role assignment', { error: err.message });
    res.status(500).json({ error: 'Failed to remove group role assignment' });
  }
});

// Get all bot role mappings
router.get('/api/bot-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const botRoleMappings = roleService.getBotRoleMappings();
    logger.info('Admin retrieved bot role mappings');
    res.json({ botRoleMappings });
  } catch (err) {
    logger.error('Error retrieving bot role mappings', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve bot role mappings' });
  }
});

// Assign role to bot
router.post('/api/bot-roles', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { botId, roleId } = req.body;

    if (!botId || !roleId) {
      return res.status(400).json({ error: 'botId and roleId are required' });
    }

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const success = roleService.setBotRole(botId, roleId);

    if (success) {
      logger.info('Admin assigned role to bot', { botId, roleId });
      res.json({ success: true, message: 'Bot role assigned successfully' });
    } else {
      res.status(500).json({ error: 'Failed to assign bot role' });
    }
  } catch (err) {
    logger.error('Error assigning bot role', { error: err.message });
    res.status(500).json({ error: 'Failed to assign bot role' });
  }
});

// Remove bot role assignment
router.delete('/api/bot-roles/:botId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { botId } = req.params;

    const success = roleService.removeBotRole(botId);

    if (success) {
      logger.info('Admin removed bot role assignment', { botId });
      res.json({ success: true, message: 'Bot role assignment removed successfully' });
    } else {
      res.status(404).json({ error: 'Bot role assignment not found' });
    }
  } catch (err) {
    logger.error('Error removing bot role assignment', { error: err.message });
    res.status(500).json({ error: 'Failed to remove bot role assignment' });
  }
});

// Get default role
router.get('/api/default-role', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const defaultRole = roleService.getDefaultRole();
    logger.info('Admin retrieved default role');
    res.json({ defaultRole });
  } catch (err) {
    logger.error('Error retrieving default role', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve default role' });
  }
});

// Set default role
router.put('/api/default-role', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    if (!roleService.roleExists(roleId)) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const success = roleService.setDefaultRole(roleId);

    if (success) {
      logger.info('Admin set default role', { roleId });
      res.json({ success: true, message: 'Default role set successfully' });
    } else {
      res.status(500).json({ error: 'Failed to set default role' });
    }
  } catch (err) {
    logger.error('Error setting default role', { error: err.message });
    res.status(500).json({ error: 'Failed to set default role' });
  }
});

module.exports = router;
