const express = require('express');
const router = express.Router();
const multer = require('multer');
const geminiConfig = require('../config/gemini.config');
const geminiController = require('../controllers/gemini.controller');
const { authenticateApiKey } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const {
  validateGenerate,
  validateChat,
  validateImageAnalysis,
  validateStream,
  validateFunctionCall,
  validateEmbeddings,
  validateSessionId,
  validateModelId
} = require('../middleware/validation.middleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: geminiConfig.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (geminiConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Apply authentication to all routes (can be disabled in development)
// Comment out the line below to disable authentication
router.use(authenticateApiKey);

// Text generation
router.post('/generate', validateGenerate, asyncHandler(geminiController.generate));

// Chat/Conversation
router.post('/chat', validateChat, asyncHandler(geminiController.chat));

// Image analysis
router.post(
  '/analyze-image',
  upload.single('image'),
  validateImageAnalysis,
  asyncHandler(geminiController.analyzeImage)
);

// Streaming
router.post('/stream', validateStream, asyncHandler(geminiController.stream));

// Function calling
router.post('/function-call', validateFunctionCall, asyncHandler(geminiController.functionCall));

// Embeddings
router.post('/embeddings', validateEmbeddings, asyncHandler(geminiController.embeddings));

// Session management
router.get('/sessions/:sessionId', validateSessionId, asyncHandler(geminiController.getSession));
router.delete('/sessions/:sessionId', validateSessionId, asyncHandler(geminiController.deleteSession));
router.post('/sessions/clear', asyncHandler(geminiController.clearSessions));

// Model information
router.get('/models', asyncHandler(geminiController.listModels));
router.get('/models/:modelId', validateModelId, asyncHandler(geminiController.getModelInfo));

module.exports = router;
