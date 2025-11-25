const { Client } = require('@line/bot-sdk');
const lineConfig = require('../config/line.config');
const logger = require('../utils/logger.util');
const geminiService = require('./gemini.service');
const sessionService = require('./session.service');
const fs = require('fs');
const path = require('path');

// Load LINE configuration from JSON file
const lineConfigData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/line-config.json'), 'utf8')
);

const client = new Client(lineConfig);

// Store LINE user sessions (maps LINE userId to sessionId)
const lineUserSessions = new Map();

async function handleEvent(event) {
  try {
    if (event.type !== 'message') {
      // Ignore non-message events
      return Promise.resolve(null);
    }

    // Handle sticker messages
    if (event.message.type === 'sticker') {
      logger.info(`Received sticker from LINE user ${event.source.userId}`);
      const stickerReply = {
        type: 'text',
        text: lineConfigData.stickerReplyText
      };
      return client.replyMessage(event.replyToken, stickerReply);
    }

    if (event.message.type !== 'text') {
      // Ignore other non-text messages (image, video, audio, etc.)
      logger.info(`Received non-text message type: ${event.message.type}`);
      return Promise.resolve(null);
    }

    const userMessage = event.message.text;
    const userId = event.source.userId;
    logger.info(`Received message from LINE user ${userId}: ${userMessage}`);

    // Get or create session for this LINE user
    let sessionId = lineUserSessions.get(userId);
    if (!sessionId || !sessionService.getSession(sessionId)) {
      sessionId = sessionService.createSession();
      lineUserSessions.set(userId, sessionId);
      logger.info(`Created new session ${sessionId} for LINE user ${userId}`);
    }

    // Get conversation history
    const messages = sessionService.getMessages(sessionId);

    // Add system instruction for Traditional Chinese and company info if this is a new session
    if (messages.length === 0) {
      sessionService.addMessage(sessionId, 'user', lineConfigData.systemPrompt.user);
      sessionService.addMessage(sessionId, 'model', lineConfigData.systemPrompt.model);
    }

    // Add user message to session
    sessionService.addMessage(sessionId, 'user', userMessage);

    // Get updated conversation history
    const updatedMessages = sessionService.getMessages(sessionId);

    // Generate response using Gemini AI
    logger.info('Generating response with Gemini AI...');
    const geminiResponse = await geminiService.chat(updatedMessages, {
      model: lineConfigData.geminiModel
    });

    // Update session with AI response
    sessionService.addMessage(sessionId, 'model', geminiResponse.reply);

    logger.info(`Gemini AI response: ${geminiResponse.reply}`);

    // Reply to the user
    const reply = {
      type: 'text',
      text: geminiResponse.reply.trim()
    };

    return client.replyMessage(event.replyToken, reply);
  } catch (err) {
    logger.error('Error handling LINE event:', err);

    // Send error message to user
    const errorReply = {
      type: 'text',
      text: '抱歉，我現在無法處理您的訊息。請稍後再試。'
    };

    try {
      return client.replyMessage(event.replyToken, errorReply);
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
