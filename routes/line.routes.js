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

// Webhook endpoint - WITHOUT middleware for testing
router.post('/webhook-test', async (req, res) => {
  try {
    const destination = req.body.destination;
    const events = req.body.events || [];

    logger.info(`📨 Webhook-test received - Bot ID: ${destination || 'N/A'}, Events: ${events.length}`);
    logger.info('Full payload:', JSON.stringify(req.body));
    logger.info('Headers:', JSON.stringify(req.headers));

    res.status(200).json({
      success: true,
      message: 'Webhook test received',
      destination: destination,
      eventsCount: events.length,
      body: req.body
    });
  } catch (err) {
    logger.error('Error in webhook-test:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Webhook endpoint - WITH LINE middleware
router.post('/webhook', async (req, res) => {
  logger.info('Webhook POST received - starting processing');

  try {
    const hasSignature = req.headers['x-line-signature'];

    // If LINE middleware is available and request has signature, use it for validation
    if (lineMiddleware && handleEvent && hasSignature) {
      logger.info('Using LINE middleware for signature validation');

      // Apply middleware manually
      lineMiddleware(req, res, async (err) => {
        if (err) {
          logger.error('LINE middleware error:', err);
          return res.status(403).json({
            success: false,
            message: 'Signature validation failed',
            error: err.message
          });
        }

        try {
          const destination = req.body.destination;
          const events = req.body.events || [];

          logger.info(`📨 Webhook received - Bot ID: ${destination}, Events: ${events.length}`);

          // Process all events in parallel, passing destination to each
          await Promise.all(events.map(event => handleEvent(event, destination)));

          logger.info('LINE webhook events processed successfully');
          res.status(200).end();
        } catch (err) {
          logger.error('Error processing LINE webhook events:', err);
          res.status(500).json({ success: false, message: err.message });
        }
      });
    } else if (!hasSignature) {
      // No signature - this is a test request, not from LINE
      logger.warn('No LINE signature found - processing as test request');
      const events = req.body.events || [];
      logger.info('Received webhook test request:', JSON.stringify(req.body));

      res.status(200).json({
        success: true,
        message: 'Test webhook received (no signature validation)',
        note: 'Real LINE requests will include X-Line-Signature header',
        eventsReceived: events.length
      });
    } else {
      // SDK not loaded properly
      logger.error('LINE SDK not loaded properly');
      res.status(500).json({
        success: false,
        message: 'LINE SDK not configured properly',
        sdkLoaded: lineMiddleware !== null,
        handlerLoaded: handleEvent !== null
      });
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
