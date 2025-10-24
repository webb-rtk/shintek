const geminiService = require('../services/gemini.service');
const sessionService = require('../services/session.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Generate text from prompt
 */
const generate = async (req, res, next) => {
  try {
    const { prompt, model, temperature, maxOutputTokens, topP, topK } = req.body;

    logger.info('Text generation request', { model, promptLength: prompt.length });

    const result = await geminiService.generateText(prompt, {
      model,
      temperature,
      maxOutputTokens,
      topP,
      topK
    });

    logger.info('Text generation successful', { tokensUsed: result.tokensUsed.total });

    return successResponse(res, result);
  } catch (error) {
    logger.error('Text generation failed', { error: error.message });
    next(error);
  }
};

/**
 * Chat conversation
 */
const chat = async (req, res, next) => {
  try {
    let { messages, model, sessionId } = req.body;

    logger.info('Chat request', { sessionId, messageCount: messages.length });

    // Create or retrieve session
    if (!sessionId) {
      sessionId = sessionService.createSession();
      logger.info('New session created', { sessionId });
    }

    // Get existing messages if session exists
    const existingMessages = sessionService.getMessages(sessionId);
    if (existingMessages && existingMessages.length > 0) {
      // Merge existing messages with new ones
      messages = [...existingMessages, ...messages];
    }

    const result = await geminiService.chat(messages, { model });

    // Update session with conversation history
    sessionService.updateSession(sessionId, result.conversationHistory);

    logger.info('Chat successful', { sessionId });

    return successResponse(res, {
      ...result,
      sessionId
    });
  } catch (error) {
    logger.error('Chat failed', { error: error.message });
    next(error);
  }
};

/**
 * Analyze image
 */
const analyzeImage = async (req, res, next) => {
  try {
    const { prompt, model } = req.body;
    let imageData;

    logger.info('Image analysis request', { model });

    // Handle file upload or base64 data
    if (req.file) {
      // Convert buffer to base64
      imageData = req.file.buffer.toString('base64');
    } else if (req.body.image) {
      imageData = req.body.image;
    } else {
      return errorResponse(res, 'Image data is required', 400);
    }

    const result = await geminiService.analyzeImage(imageData, prompt, {
      model,
      mimeType: req.file?.mimetype
    });

    logger.info('Image analysis successful');

    return successResponse(res, result);
  } catch (error) {
    logger.error('Image analysis failed', { error: error.message });
    next(error);
  }
};

/**
 * Stream text generation
 */
const stream = async (req, res, next) => {
  try {
    const { prompt, model } = req.body;

    logger.info('Stream request', { model, promptLength: prompt.length });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate and stream content
    const streamGenerator = geminiService.streamText(prompt, { model });

    for await (const chunk of streamGenerator) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    logger.info('Stream completed');
  } catch (error) {
    logger.error('Stream failed', { error: error.message });
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Function calling
 */
const functionCall = async (req, res, next) => {
  try {
    const { prompt, functions, model } = req.body;

    logger.info('Function call request', { model, functionCount: functions.length });

    const result = await geminiService.functionCall(prompt, functions, { model });

    logger.info('Function call successful');

    return successResponse(res, result);
  } catch (error) {
    logger.error('Function call failed', { error: error.message });
    next(error);
  }
};

/**
 * Generate embeddings
 */
const embeddings = async (req, res, next) => {
  try {
    const { text, model } = req.body;

    logger.info('Embeddings request', { model, textCount: Array.isArray(text) ? text.length : 1 });

    const result = await geminiService.generateEmbeddings(text, { model });

    logger.info('Embeddings generated successfully');

    return successResponse(res, result);
  } catch (error) {
    logger.error('Embeddings generation failed', { error: error.message });
    next(error);
  }
};

/**
 * Get session
 */
const getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = sessionService.getSession(sessionId);

    if (!session) {
      return errorResponse(res, 'Session not found or expired', 404);
    }

    logger.info('Session retrieved', { sessionId });

    return successResponse(res, session);
  } catch (error) {
    logger.error('Get session failed', { error: error.message });
    next(error);
  }
};

/**
 * Delete session
 */
const deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const deleted = sessionService.deleteSession(sessionId);

    if (!deleted) {
      return errorResponse(res, 'Session not found', 404);
    }

    logger.info('Session deleted', { sessionId });

    return successResponse(res, { deleted: true }, 'Session deleted successfully');
  } catch (error) {
    logger.error('Delete session failed', { error: error.message });
    next(error);
  }
};

/**
 * Clear all sessions
 */
const clearSessions = async (req, res, next) => {
  try {
    sessionService.clearAllSessions();

    logger.info('All sessions cleared');

    return successResponse(res, { cleared: true }, 'All sessions cleared successfully');
  } catch (error) {
    logger.error('Clear sessions failed', { error: error.message });
    next(error);
  }
};

/**
 * List available models
 */
const listModels = async (req, res, next) => {
  try {
    logger.info('List models request');

    const models = await geminiService.listModels();

    logger.info('Models listed successfully', { count: models.length });

    return successResponse(res, { models });
  } catch (error) {
    logger.error('List models failed', { error: error.message });
    next(error);
  }
};

/**
 * Get model info
 */
const getModelInfo = async (req, res, next) => {
  try {
    const { modelId } = req.params;

    logger.info('Get model info request', { modelId });

    const modelInfo = await geminiService.getModelInfo(modelId);

    logger.info('Model info retrieved successfully');

    return successResponse(res, modelInfo);
  } catch (error) {
    logger.error('Get model info failed', { error: error.message });
    next(error);
  }
};

module.exports = {
  generate,
  chat,
  analyzeImage,
  stream,
  functionCall,
  embeddings,
  getSession,
  deleteSession,
  clearSessions,
  listModels,
  getModelInfo
};
