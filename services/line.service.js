const { Client } = require('@line/bot-sdk');
const lineConfig = require('../config/line.config');
const logger = require('../utils/logger.util');
const geminiService = require('./gemini.service');
const sessionService = require('./session.service');
const roleService = require('./role.service');

// Create clients for all configured bots
const clients = new Map();

function getClient(destination, botConfig = null) {
  // If a specific bot config is provided, use it (from signature validation)
  if (botConfig) {
    const configKey = botConfig.channelAccessToken;
    if (clients.has(configKey)) {
      return clients.get(configKey);
    }

    // Create new client for this config
    const client = new Client(botConfig);
    clients.set(configKey, client);

    if (destination) {
      clients.set(destination, client);
    }

    logger.info(`Created new LINE client from validated config for destination: ${destination || 'unknown'}`);
    return client;
  }

  // Try to get specific client for this destination
  if (destination && clients.has(destination)) {
    return clients.get(destination);
  }

  // Get the appropriate config for this destination
  const config = lineConfig.getBotConfig(destination);

  // Check if we already have a client for this config
  const configKey = config.channelAccessToken;
  if (clients.has(configKey)) {
    return clients.get(configKey);
  }

  // Create new client for this config
  const client = new Client(config);
  clients.set(configKey, client);

  if (destination) {
    clients.set(destination, client);
  }

  logger.info(`Created new LINE client for destination: ${destination || 'default'}`);
  return client;
}

// Legacy default client
const client = getClient(null);

// Store LINE user sessions (maps LINE userId to sessionId)
const lineUserSessions = new Map();

async function handleEvent(event, destination = null, botConfig = null) {
  try {
    if (event.type !== 'message') {
      // Ignore non-message events
      return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const groupId = event.source.groupId || null;

    // Log incoming message with complete source information
    const sourceType = groupId ? 'GROUP' : 'DIRECT';
    const logParts = [
      `[${sourceType}]`,
      `Bot: ${destination || 'N/A'}`,
      `User: ${userId}`
    ];
    if (groupId) {
      logParts.push(`Group: ${groupId}`);
    }
    logger.info(`📩 ${logParts.join(' | ')}`);

    // Get role configuration for this user/group/bot
    const roleConfig = roleService.getRoleForUser(userId, groupId, destination);
    logger.info(`🤖 Using role: ${roleConfig.roleId} (${roleConfig.name})`);

    // Handle sticker messages
    if (event.message.type === 'sticker') {
      logger.info(`Received sticker from LINE user ${userId}`);
      const stickerReply = {
        type: 'text',
        text: roleConfig.stickerReplyText
      };
      const botClient = getClient(destination, botConfig);
      return botClient.replyMessage(event.replyToken, stickerReply);
    }

    if (event.message.type !== 'text') {
      // Ignore other non-text messages (image, video, audio, etc.)
      logger.info(`Received non-text message type: ${event.message.type}`);
      return Promise.resolve(null);
    }

    const userMessage = event.message.text;
    logger.info(`Message content: ${userMessage}`);

    // Special command: /showid - Display User ID and Group ID
    if (userMessage.trim() === '/showid') {
      let idInfo = `📋 LINE IDs Information\n\n`;
      if (destination) {
        idInfo += `🤖 Bot ID (Destination):\n${destination}\n\n`;
      }
      idInfo += `👤 User ID:\n${userId}\n`;
      if (groupId) {
        idInfo += `\n👥 Group ID:\n${groupId}`;
      } else {
        idInfo += `\n(This is a direct message, no Group ID)`;
      }
      idInfo += `\n\n💡 Tip: Use these IDs in the Admin Dashboard to assign specific AI roles!`;

      logger.info(`User ${userId} requested ID information`);

      const reply = {
        type: 'text',
        text: idInfo
      };
      const botClient = getClient(destination, botConfig);
      return botClient.replyMessage(event.replyToken, reply);
    }

    // Get or create session for this LINE user
    let sessionId = lineUserSessions.get(userId);
    if (!sessionId || !sessionService.getSession(sessionId)) {
      sessionId = sessionService.createSession(roleConfig.roleId);
      lineUserSessions.set(userId, sessionId);
      logger.info(`Created new session ${sessionId} for LINE user ${userId} with role ${roleConfig.roleId}`);
    }

    // Get session and check if role has changed
    const session = sessionService.getSession(sessionId);
    if (session.roleId !== roleConfig.roleId) {
      logger.info(`Role changed from ${session.roleId} to ${roleConfig.roleId} for user ${userId}, creating new session`);
      // Role has changed, create a new session with the new role
      sessionId = sessionService.createSession(roleConfig.roleId);
      lineUserSessions.set(userId, sessionId);
    }

    // Get conversation history
    const messages = sessionService.getMessages(sessionId);

    // Add system instruction if this is a new session
    if (messages.length === 0) {
      sessionService.addMessage(sessionId, 'user', roleConfig.systemPrompt.user);
      sessionService.addMessage(sessionId, 'model', roleConfig.systemPrompt.model);
    }

    // Add user message to session
    sessionService.addMessage(sessionId, 'user', userMessage);

    // Get updated conversation history
    const updatedMessages = sessionService.getMessages(sessionId);

    // Generate response using Gemini AI
    logger.info('Generating response with Gemini AI...');
    const geminiResponse = await geminiService.chat(updatedMessages, {
      model: roleConfig.geminiModel
    });

    // Update session with AI response
    sessionService.addMessage(sessionId, 'model', geminiResponse.reply);

    logger.info(`Gemini AI response: ${geminiResponse.reply}`);

    // Reply to the user
    const reply = {
      type: 'text',
      text: geminiResponse.reply.trim()
    };

    const botClient = getClient(destination, botConfig);
    return botClient.replyMessage(event.replyToken, reply);
  } catch (err) {
    logger.error('Error handling LINE event:', err);

    // Send error message to user
    const errorReply = {
      type: 'text',
      text: '抱歉，我現在無法處理您的訊息。請稍後再試。'
    };

    try {
      const botClient = getClient(destination, botConfig);
      return botClient.replyMessage(event.replyToken, errorReply);
    } catch (replyErr) {
      logger.error('Error sending error reply:', replyErr);
      return Promise.reject(err);
    }
  }
}

module.exports = {
  handleEvent,
  client,
};
