const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiConfig = require('../config/gemini.config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
  }

  /**
   * Normalize model name to include 'models/' prefix if not present
   */
  normalizeModelName(modelName) {
    if (!modelName) return null;
    if (modelName.startsWith('models/')) return modelName;
    return `models/${modelName}`;
  }

  /**
   * Generate text content from a prompt
   */
  async generateText(prompt, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.flash;

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          ...geminiConfig.generationConfig,
          temperature: options.temperature ?? geminiConfig.generationConfig.temperature,
          maxOutputTokens: options.maxOutputTokens ?? geminiConfig.generationConfig.maxOutputTokens,
          topP: options.topP ?? geminiConfig.generationConfig.topP,
          topK: options.topK ?? geminiConfig.generationConfig.topK,
        },
        safetySettings: geminiConfig.safetySettings,
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        text,
        model: modelName,
        tokensUsed: {
          prompt: result.response.usageMetadata?.promptTokenCount || 0,
          completion: result.response.usageMetadata?.candidatesTokenCount || 0,
          total: result.response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      throw new Error(`Gemini text generation failed: ${error.message}`);
    }
  }

  /**
   * Multi-turn chat conversation
   */
  async chat(messages, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.flash;

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: geminiConfig.generationConfig,
        safetySettings: geminiConfig.safetySettings,
      });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;

      return {
        reply: response.text(),
        conversationHistory: messages.concat({
          role: 'model',
          content: response.text()
        })
      };
    } catch (error) {
      throw new Error(`Gemini chat failed: ${error.message}`);
    }
  }

  /**
   * Analyze image with text prompt
   */
  async analyzeImage(imageData, prompt, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.pro;

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: geminiConfig.generationConfig,
        safetySettings: geminiConfig.safetySettings,
      });

      // Convert base64 to proper format if needed
      let imagePart;
      if (imageData.startsWith('data:')) {
        const [mimeType, base64Data] = imageData.split(';base64,');
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType.replace('data:', '')
          }
        };
      } else {
        // Assume it's already base64 encoded
        imagePart = {
          inlineData: {
            data: imageData,
            mimeType: options.mimeType || 'image/jpeg'
          }
        };
      }

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;

      return {
        analysis: response.text(),
        confidence: 0.95 // Gemini doesn't provide confidence scores directly
      };
    } catch (error) {
      throw new Error(`Gemini image analysis failed: ${error.message}`);
    }
  }

  /**
   * Stream text generation
   */
  async *streamText(prompt, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.flash;

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: geminiConfig.generationConfig,
        safetySettings: geminiConfig.safetySettings,
      });

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
      }
    } catch (error) {
      throw new Error(`Gemini streaming failed: ${error.message}`);
    }
  }

  /**
   * Function calling
   */
  async functionCall(prompt, functions, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.pro;

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: geminiConfig.generationConfig,
        safetySettings: geminiConfig.safetySettings,
        tools: [{ functionDeclarations: functions }]
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Check if there's a function call
      const call = response.functionCalls()?.[0];

      if (call) {
        return {
          functionCall: {
            name: call.name,
            arguments: call.args
          },
          text: response.text() || ''
        };
      }

      return {
        functionCall: null,
        text: response.text()
      };
    } catch (error) {
      throw new Error(`Gemini function calling failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(text, options = {}) {
    try {
      const modelName = this.normalizeModelName(options.model) || geminiConfig.models.embedding;

      const model = this.genAI.getGenerativeModel({
        model: modelName
      });

      const texts = Array.isArray(text) ? text : [text];
      const results = await Promise.all(
        texts.map(t => model.embedContent(t))
      );

      const embeddings = results.map(r => r.embedding.values);

      return {
        embeddings,
        dimensions: embeddings[0]?.length || 0
      };
    } catch (error) {
      throw new Error(`Gemini embeddings generation failed: ${error.message}`);
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      // Return a static list of available Gemini models
      // The SDK doesn't provide a listModels function in the current version
      return [
        {
          name: 'gemini-2.0-flash-exp',
          displayName: 'Gemini 2.0 Flash (Experimental)',
          description: 'Latest experimental model with improved performance',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
        },
        {
          name: 'gemini-exp-1206',
          displayName: 'Gemini Experimental 1206',
          description: 'Experimental model from December 2024',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
        },
        {
          name: 'models/gemini-1.5-pro',
          displayName: 'Gemini 1.5 Pro',
          description: 'Most capable model for complex tasks',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
        },
        {
          name: 'models/gemini-1.5-flash',
          displayName: 'Gemini 1.5 Flash',
          description: 'Fast and efficient model for most tasks',
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
        },
        {
          name: 'models/text-embedding-004',
          displayName: 'Text Embedding 004',
          description: 'Latest embedding model',
          inputTokenLimit: 2048,
          outputTokenLimit: 0,
          supportedGenerationMethods: ['embedContent']
        }
      ];
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(modelName) {
    try {
      const model = await this.genAI.getGenerativeModel({ model: modelName });
      return {
        name: modelName,
        // Additional model info can be added here
      };
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
