const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger.util');

let handleEvent = null;
let lineConfig = null;

// Try to load LINE SDK dependencies
try {
  lineConfig = require('../config/line.config');
  const lineService = require('../services/line.service');
  handleEvent = lineService.handleEvent;

  logger.info('LINE Bot SDK loaded successfully');
} catch (err) {
  logger.error('Error loading LINE Bot SDK:', err);
}

// Validate LINE signature manually (same algorithm as LINE SDK)
function validateSignature(bodyBuffer, signature, channelSecret) {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(bodyBuffer)
    .digest('base64');

  logger.info(`Signature validation - Expected: ${hash}, Received: ${signature}, Match: ${hash === signature}`);
  return hash === signature;
}

// Try to validate with all configured bot secrets
function validateWithAllBots(bodyBuffer, signature) {
  if (!lineConfig) return null;

  const configs = lineConfig.getAllBotConfigs();
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    logger.info(`Trying bot ${i + 1} with secret: ${config.channelSecret.substring(0, 8)}...`);
    if (validateSignature(bodyBuffer, signature, config.channelSecret)) {
      logger.info(`✓ Signature validated with bot ${i + 1}`);
      return config;
    }
  }
  logger.error(`✗ Signature validation failed for all ${configs.length} configured bots`);
  return null;
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

// Webhook endpoint - WITH manual signature validation for multiple bots
router.post('/webhook',
  express.json({
    verify: (req, res, buf, encoding) => {
      // Store raw body buffer for signature validation (LINE needs the raw bytes)
      req.rawBody = buf;
    }
  }),
  async (req, res) => {
    logger.info('Webhook POST received - starting processing');

    try {
      const signature = req.headers['x-line-signature'];

      // Validate signature with all configured bots
      if (signature && lineConfig && handleEvent) {
        const validConfig = validateWithAllBots(req.rawBody, signature);

        if (!validConfig) {
          logger.error('LINE signature validation failed for all bots', {
            signature,
            receivedFrom: req.body?.destination
          });
          return res.status(403).json({
            success: false,
            message: 'Signature validation failed - no matching bot found'
          });
        }

        logger.info('Signature validated successfully with matching bot config');

        const destination = req.body.destination;
        const events = req.body.events || [];

        logger.info(`📨 Webhook received - Bot ID: ${destination}, Events: ${events.length}`);

        // Process all events in parallel, passing destination AND the validated config to each
        await Promise.all(events.map(event => handleEvent(event, destination, validConfig)));

        logger.info('LINE webhook events processed successfully');
        return res.status(200).end();

      } else if (!signature) {
        // No signature - this is a test request, not from LINE
        logger.warn('No LINE signature found - processing as test request');
        const events = req.body?.events || [];
        logger.info('Received webhook test request:', JSON.stringify(req.body));

        return res.status(200).json({
          success: true,
          message: 'Test webhook received (no signature validation)',
          note: 'Real LINE requests will include X-Line-Signature header',
          eventsReceived: events.length
        });
      } else {
        // SDK not loaded properly
        logger.error('LINE SDK not loaded properly');
        return res.status(500).json({
          success: false,
          message: 'LINE SDK not configured properly',
          handleEventLoaded: handleEvent !== null
        });
      }
    } catch (err) {
      logger.error('Error in LINE webhook:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'LINE Bot server is running',
    sdkLoaded: lineMiddleware !== null
  });
});

module.exports = router;
