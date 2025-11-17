const express = require('express');
const router = express.Router();
const logger = require('../utils/logger.util');

let lineMiddleware = null;
let handleEvent = null;

// Try to load LINE SDK dependencies
try {
  const { middleware } = require('@line/bot-sdk');
  const lineConfig = require('../config/line.config');
  const lineService = require('../services/line.service');

  lineMiddleware = middleware(lineConfig);
  handleEvent = lineService.handleEvent;

  logger.info('LINE Bot SDK loaded successfully');
} catch (err) {
  logger.error('Error loading LINE Bot SDK:', err);
}

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    // If LINE middleware is available, use it for signature validation
    if (lineMiddleware) {
      // Apply middleware manually
      lineMiddleware(req, res, async () => {
        try {
          const events = req.body.events;

          // Process all events in parallel
          await Promise.all(events.map(handleEvent));

          logger.info('LINE webhook events processed successfully');
          res.status(200).end();
        } catch (err) {
          logger.error('Error processing LINE webhook events:', err);
          res.status(500).end();
        }
      });
    } else {
      // Fallback: respond without signature validation
      logger.warn('LINE middleware not available, processing without signature validation');
      const events = req.body.events || [];
      logger.info('Received LINE webhook request:', JSON.stringify(req.body));
      res.status(200).json({ success: true, message: 'Webhook received (SDK not configured)' });
    }
  } catch (err) {
    logger.error('Error in LINE webhook:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'LINE Bot server is running',
    sdkLoaded: lineMiddleware !== null
  });
});

module.exports = router;
