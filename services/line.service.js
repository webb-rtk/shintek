const { Client } = require('@line/bot-sdk');
const lineConfig = require('../config/line.config');
const logger = require('../utils/logger.util');

const client = new Client(lineConfig);

async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') {
      // Ignore non-text messages
      return Promise.resolve(null);
    }

    const userMessage = event.message.text;
    logger.info(`Received message from LINE: ${userMessage}`);

    // Echo back the message (you can replace this with your custom logic)
    const echo = {
      type: 'text',
      text: `You said: ${userMessage}`
    };

    // Reply to the user
    return client.replyMessage(event.replyToken, echo);
  } catch (err) {
    logger.error('Error handling LINE event:', err);
    return Promise.reject(err);
  }
}

module.exports = {
  handleEvent,
  client,
};
