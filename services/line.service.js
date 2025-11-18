const { Client } = require('@line/bot-sdk');
const lineConfig = require('../config/line.config');
const logger = require('../utils/logger.util');
const geminiService = require('./gemini.service');
const sessionService = require('./session.service');

const client = new Client(lineConfig);

// Store LINE user sessions (maps LINE userId to sessionId)
const lineUserSessions = new Map();

async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') {
      // Ignore non-text messages
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

    // Add system instruction for Traditional Chinese if this is a new session
    if (messages.length === 0) {
      sessionService.addMessage(sessionId, 'user', '請用繁體中文回答所有問題。');
      sessionService.addMessage(sessionId, 'model', '好的，我會使用繁體中文回答您的所有問題。');
    }

    // Add user message to session
    sessionService.addMessage(sessionId, 'user', userMessage);

    // Get updated conversation history
    const updatedMessages = sessionService.getMessages(sessionId);

    // Generate response using Gemini AI
    logger.info('Generating response with Gemini AI...');
    const geminiResponse = await geminiService.chat(updatedMessages, {
      model: 'gemini-2.0-flash-exp' // Using the fast model for quick responses
    });

    // Update session with AI response
    sessionService.addMessage(sessionId, 'model', geminiResponse.reply);

    logger.info(`Gemini AI response: ${geminiResponse.reply}`);

    // Reply to the user
    const reply = {
      type: 'text',
      text: geminiResponse.reply
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
