const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'line-config.json');

class RoleService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Error loading role config:', error);
      // Initialize with default structure if file doesn't exist or is invalid
      this.config = {
        roles: {
          'customer-service': {
            name: '客服助理',
            description: '預設客服助理',
            systemPrompt: {
              user: '你是一個專業的客服助理。',
              model: '好的，我會協助客戶。'
            },
            geminiModel: 'gemini-2.0-flash-exp',
            stickerReplyText: '謝謝您！'
          }
        },
        userRoleMapping: {},
        groupRoleMapping: {},
        botRoleMapping: {},
        defaultRole: 'customer-service'
      };
    }
  }

  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving role config:', error);
      return false;
    }
  }

  /**
   * Get role configuration for a specific user/group/bot
   * Priority: Bot mapping > User mapping > Group mapping > Default role
   * @param {string} userId - LINE user ID
   * @param {string} groupId - LINE group ID (optional)
   * @param {string} botId - Bot ID (optional)
   * @returns {object} Role configuration
   */
  getRoleForUser(userId, groupId = null, botId = null) {
    this.loadConfig(); // Reload config to get latest changes

    let roleId = null;

    // 1. Check if bot has explicit role assignment
    if (botId && this.config.botRoleMapping && this.config.botRoleMapping[botId]) {
      roleId = this.config.botRoleMapping[botId];
    }
    // 2. Check if user has explicit role assignment
    else if (this.config.userRoleMapping && this.config.userRoleMapping[userId]) {
      roleId = this.config.userRoleMapping[userId];
    }
    // 3. If in a group, check group role assignment
    else if (groupId && this.config.groupRoleMapping && this.config.groupRoleMapping[groupId]) {
      roleId = this.config.groupRoleMapping[groupId];
    }
    // 4. Fall back to default role
    else {
      roleId = this.config.defaultRole || 'customer-service';
    }

    return this.getRoleConfig(roleId);
  }

  /**
   * Get configuration for a specific role
   * @param {string} roleId - Role ID
   * @returns {object} Role configuration with roleId included
   */
  getRoleConfig(roleId) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.warn(`Role ${roleId} not found, using default role`);
      roleId = this.config.defaultRole || 'customer-service';
    }

    const roleConfig = this.config.roles[roleId];
    return {
      roleId,
      ...roleConfig
    };
  }

  /**
   * List all available roles
   * @returns {array} Array of role objects with id and config
   */
  listRoles() {
    this.loadConfig();

    return Object.keys(this.config.roles || {}).map(roleId => ({
      roleId,
      ...this.config.roles[roleId]
    }));
  }

  /**
   * Create a new role
   * @param {string} roleId - Unique role identifier
   * @param {object} roleConfig - Role configuration
   * @returns {boolean} Success status
   */
  createRole(roleId, roleConfig) {
    this.loadConfig();

    if (!this.config.roles) {
      this.config.roles = {};
    }

    if (this.config.roles[roleId]) {
      console.error(`Role ${roleId} already exists`);
      return false;
    }

    this.config.roles[roleId] = roleConfig;
    return this.saveConfig();
  }

  /**
   * Update an existing role
   * @param {string} roleId - Role identifier
   * @param {object} roleConfig - Updated role configuration
   * @returns {boolean} Success status
   */
  updateRole(roleId, roleConfig) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    this.config.roles[roleId] = roleConfig;
    return this.saveConfig();
  }

  /**
   * Delete a role
   * @param {string} roleId - Role identifier
   * @returns {boolean} Success status
   */
  deleteRole(roleId) {
    this.loadConfig();

    // Don't allow deleting the default role
    if (roleId === this.config.defaultRole) {
      console.error(`Cannot delete default role ${roleId}`);
      return false;
    }

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    delete this.config.roles[roleId];

    // Remove any mappings to this role
    if (this.config.userRoleMapping) {
      Object.keys(this.config.userRoleMapping).forEach(userId => {
        if (this.config.userRoleMapping[userId] === roleId) {
          delete this.config.userRoleMapping[userId];
        }
      });
    }

    if (this.config.groupRoleMapping) {
      Object.keys(this.config.groupRoleMapping).forEach(groupId => {
        if (this.config.groupRoleMapping[groupId] === roleId) {
          delete this.config.groupRoleMapping[groupId];
        }
      });
    }

    if (this.config.botRoleMapping) {
      Object.keys(this.config.botRoleMapping).forEach(botId => {
        if (this.config.botRoleMapping[botId] === roleId) {
          delete this.config.botRoleMapping[botId];
        }
      });
    }

    return this.saveConfig();
  }

  /**
   * Set role for a specific user
   * @param {string} userId - LINE user ID
   * @param {string} roleId - Role identifier
   * @returns {boolean} Success status
   */
  setUserRole(userId, roleId) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    if (!this.config.userRoleMapping) {
      this.config.userRoleMapping = {};
    }

    this.config.userRoleMapping[userId] = roleId;
    return this.saveConfig();
  }

  /**
   * Remove role assignment for a specific user
   * @param {string} userId - LINE user ID
   * @returns {boolean} Success status
   */
  removeUserRole(userId) {
    this.loadConfig();

    if (!this.config.userRoleMapping || !this.config.userRoleMapping[userId]) {
      return false;
    }

    delete this.config.userRoleMapping[userId];
    return this.saveConfig();
  }

  /**
   * Set role for a specific group
   * @param {string} groupId - LINE group ID
   * @param {string} roleId - Role identifier
   * @returns {boolean} Success status
   */
  setGroupRole(groupId, roleId) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    if (!this.config.groupRoleMapping) {
      this.config.groupRoleMapping = {};
    }

    this.config.groupRoleMapping[groupId] = roleId;
    return this.saveConfig();
  }

  /**
   * Remove role assignment for a specific group
   * @param {string} groupId - LINE group ID
   * @returns {boolean} Success status
   */
  removeGroupRole(groupId) {
    this.loadConfig();

    if (!this.config.groupRoleMapping || !this.config.groupRoleMapping[groupId]) {
      return false;
    }

    delete this.config.groupRoleMapping[groupId];
    return this.saveConfig();
  }

  /**
   * Get all user role mappings
   * @returns {object} User to role mapping
   */
  getUserRoleMappings() {
    this.loadConfig();
    return this.config.userRoleMapping || {};
  }

  /**
   * Get all group role mappings
   * @returns {object} Group to role mapping
   */
  getGroupRoleMappings() {
    this.loadConfig();
    return this.config.groupRoleMapping || {};
  }

  /**
   * Set role for a specific bot
   * @param {string} botId - Bot ID
   * @param {string} roleId - Role identifier
   * @returns {boolean} Success status
   */
  setBotRole(botId, roleId) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    if (!this.config.botRoleMapping) {
      this.config.botRoleMapping = {};
    }

    this.config.botRoleMapping[botId] = roleId;
    return this.saveConfig();
  }

  /**
   * Remove role assignment for a specific bot
   * @param {string} botId - Bot ID
   * @returns {boolean} Success status
   */
  removeBotRole(botId) {
    this.loadConfig();

    if (!this.config.botRoleMapping || !this.config.botRoleMapping[botId]) {
      return false;
    }

    delete this.config.botRoleMapping[botId];
    return this.saveConfig();
  }

  /**
   * Get all bot role mappings
   * @returns {object} Bot to role mapping
   */
  getBotRoleMappings() {
    this.loadConfig();
    return this.config.botRoleMapping || {};
  }

  /**
   * Get default role ID
   * @returns {string} Default role ID
   */
  getDefaultRole() {
    this.loadConfig();
    return this.config.defaultRole || 'customer-service';
  }

  /**
   * Set default role
   * @param {string} roleId - Role identifier
   * @returns {boolean} Success status
   */
  setDefaultRole(roleId) {
    this.loadConfig();

    if (!this.config.roles || !this.config.roles[roleId]) {
      console.error(`Role ${roleId} not found`);
      return false;
    }

    this.config.defaultRole = roleId;
    return this.saveConfig();
  }

  /**
   * Check if a role exists
   * @param {string} roleId - Role identifier
   * @returns {boolean} Whether role exists
   */
  roleExists(roleId) {
    this.loadConfig();
    return !!(this.config.roles && this.config.roles[roleId]);
  }
}

// Export singleton instance
module.exports = new RoleService();
