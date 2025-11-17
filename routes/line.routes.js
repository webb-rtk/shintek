const express = require('express');
const router = express.Router();
const { middleware } = require('@line/bot-sdk');
const lineConfig = require('../config/line.config');
const { handleEvent } = require('../services/line.service');
const logger = require('../utils/logger.util');

// Webhook endpoint
router.post('/webhook', middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;

    // Process all events in parallel
    await Promise.all(events.map(handleEvent));

    logger.info('LINE webhook events processed successfully');
    res.status(200).end();
  } catch (err) {
    logger.error('Error processing LINE webhook:', err);
    res.status(500).end();
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'LINE Bot server is running' });
});

module.exports = router;
