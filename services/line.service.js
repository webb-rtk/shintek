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

    // Add system instruction for Traditional Chinese and company info if this is a new session
    if (messages.length === 0) {
      const companyInfo = `你是一個專業的客服助理，負責回答關於我們公司的問題。

公司資訊：

【公司提供的服務】
我們公司主要提供以下服務：
1. 軟體開發 - 提供客製化軟體開發服務，包括網頁應用、行動應用、企業系統等
2. 系統整合 - 協助企業整合現有系統，提升營運效率
3. AI解決方案 - 提供人工智慧相關的解決方案，包括機器學習、自然語言處理、電腦視覺等應用

【公司的核心技術】
- 人工智慧與機器學習技術
- 雲端運算平台（AWS、Google Cloud等）
- 全端開發技術（前端、後端、資料庫）
- 系統整合與API開發
- 自動化與DevOps

【公司的競爭優勢】
- 豐富的產業經驗與技術實力
- 專業的技術團隊
- 快速回應客戶需求
- 提供完整的售後服務與技術支援
- 持續創新與技術研發

請用繁體中文回答所有問題。當用戶詢問關於公司服務、技術或優勢時，請根據以上資訊來回答。如果用戶問題超出以上範圍，請禮貌地回應並詢問是否需要其他協助。`;

      sessionService.addMessage(sessionId, 'user', companyInfo);
      sessionService.addMessage(sessionId, 'model', '好的，我已經了解公司的資訊。我會使用繁體中文回答所有問題，並根據公司提供的服務、核心技術和競爭優勢來協助客戶。如果有任何關於公司的問題，我都會專業且詳細地回答。');
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
