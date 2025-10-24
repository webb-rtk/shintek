require('dotenv').config();
const { unauthorizedResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * API Key authentication middleware
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // Skip authentication in development if no API_SECRET_KEY is set or is default
  const isDefaultKey = !process.env.API_SECRET_KEY || process.env.API_SECRET_KEY === 'your_secret_key_here';
  if (process.env.NODE_ENV === 'development' && isDefaultKey) {
    logger.warn('API authentication disabled in development mode (no valid API_SECRET_KEY set)');
    return next();
  }

  if (!apiKey) {
    logger.warn('API key missing in request');
    return unauthorizedResponse(res, 'API key is required');
  }

  if (apiKey !== process.env.API_SECRET_KEY) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    return unauthorizedResponse(res, 'Invalid API key');
  }

  next();
};

/**
 * Optional authentication - doesn't block if no key provided
 */
const optionalAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (apiKey && apiKey === process.env.API_SECRET_KEY) {
    req.authenticated = true;
  } else {
    req.authenticated = false;
  }

  next();
};

module.exports = {
  authenticateApiKey,
  optionalAuth
};
