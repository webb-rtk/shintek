const { body, param, validationResult } = require('express-validator');
const { validationErrorResponse } = require('../utils/response.util');

/**
 * Validate request and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors.array());
  }

  next();
};

/**
 * Validation rules for text generation
 */
const validateGenerate = [
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isString()
    .withMessage('Prompt must be a string')
    .isLength({ max: 10000 })
    .withMessage('Prompt must be less than 10000 characters'),
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string')
    .custom((value) => {
      const validModels = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro', 'models/gemini-1.5-pro',
        'gemini-1.5-flash', 'models/gemini-1.5-flash',
        'gemini-pro', 'models/gemini-pro',
        'gemini-exp-1206',
        'learnlm-1.5-pro-experimental'
      ];
      return validModels.includes(value);
    })
    .withMessage('Invalid model'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('maxOutputTokens')
    .optional()
    .isInt({ min: 1, max: 8192 })
    .withMessage('maxOutputTokens must be between 1 and 8192'),
  validate
];

/**
 * Validation rules for chat
 */
const validateChat = [
  body('messages')
    .notEmpty()
    .withMessage('Messages are required')
    .isArray({ min: 1 })
    .withMessage('Messages must be a non-empty array'),
  body('messages.*.role')
    .isIn(['user', 'model'])
    .withMessage('Message role must be either "user" or "model"'),
  body('messages.*.content')
    .notEmpty()
    .withMessage('Message content is required')
    .isString()
    .withMessage('Message content must be a string'),
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('SessionId must be a string'),
  validate
];

/**
 * Validation rules for image analysis
 */
const validateImageAnalysis = [
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isString()
    .withMessage('Prompt must be a string'),
  body('image')
    .optional()
    .isString()
    .withMessage('Image data must be a string'),
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),
  validate
];

/**
 * Validation rules for streaming
 */
const validateStream = [
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isString()
    .withMessage('Prompt must be a string')
    .isLength({ max: 10000 })
    .withMessage('Prompt must be less than 10000 characters'),
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),
  validate
];

/**
 * Validation rules for function calling
 */
const validateFunctionCall = [
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isString()
    .withMessage('Prompt must be a string'),
  body('functions')
    .notEmpty()
    .withMessage('Functions are required')
    .isArray({ min: 1 })
    .withMessage('Functions must be a non-empty array'),
  body('functions.*.name')
    .notEmpty()
    .withMessage('Function name is required')
    .isString()
    .withMessage('Function name must be a string'),
  body('functions.*.description')
    .notEmpty()
    .withMessage('Function description is required')
    .isString()
    .withMessage('Function description must be a string'),
  validate
];

/**
 * Validation rules for embeddings
 */
const validateEmbeddings = [
  body('text')
    .notEmpty()
    .withMessage('Text is required')
    .custom((value) => typeof value === 'string' || Array.isArray(value))
    .withMessage('Text must be a string or array of strings'),
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),
  validate
];

/**
 * Validation rules for session ID
 */
const validateSessionId = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isString()
    .withMessage('Session ID must be a string'),
  validate
];

/**
 * Validation rules for model ID
 */
const validateModelId = [
  param('modelId')
    .notEmpty()
    .withMessage('Model ID is required')
    .isString()
    .withMessage('Model ID must be a string'),
  validate
];

module.exports = {
  validate,
  validateGenerate,
  validateChat,
  validateImageAnalysis,
  validateStream,
  validateFunctionCall,
  validateEmbeddings,
  validateSessionId,
  validateModelId
};
