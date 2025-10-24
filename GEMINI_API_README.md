# Gemini AI API Documentation

This API provides a RESTful interface to Google's Gemini AI capabilities, including text generation, chat, image analysis, streaming, function calling, and embeddings.

## Table of Contents
- [Setup](#setup)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

## Setup

### 1. Environment Configuration

Edit the `.env` file and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
API_SECRET_KEY=your_secret_key_here
NODE_ENV=development
```

To get your Gemini API key:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into `.env`

### 2. Start the Server

```bash
npm start
```

The API will be available at:
- HTTP: `http://localhost` (redirects to HTTPS)
- HTTPS: `https://localhost:443`

## Configuration

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configure in `.env`: `RATE_LIMIT_WINDOW` and `RATE_LIMIT_MAX_REQUESTS`

### File Upload Limits
- Default: 10MB max file size
- Configure in `.env`: `MAX_FILE_SIZE`

## Authentication

All API endpoints require authentication via API key.

Include your API key in one of two ways:

**Header (Recommended):**
```
x-api-key: your_secret_key_here
```

**Query Parameter:**
```
?apiKey=your_secret_key_here
```

## API Endpoints

### 1. Text Generation

Generate text content from a prompt.

**Endpoint:** `POST /api/gemini/generate`

**Request Body:**
```json
{
  "prompt": "Write a short poem about AI",
  "model": "gemini-1.5-flash",
  "temperature": 0.7,
  "maxOutputTokens": 8192,
  "topP": 0.95,
  "topK": 40
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "text": "Generated text content here...",
    "model": "gemini-1.5-flash",
    "tokensUsed": {
      "prompt": 10,
      "completion": 50,
      "total": 60
    }
  }
}
```

### 2. Chat/Conversation

Multi-turn conversation with context management.

**Endpoint:** `POST /api/gemini/chat`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is artificial intelligence?"
    }
  ],
  "model": "gemini-1.5-flash",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "reply": "AI response here...",
    "sessionId": "abc-123-def",
    "conversationHistory": [
      {"role": "user", "content": "What is artificial intelligence?"},
      {"role": "model", "content": "AI response here..."}
    ]
  }
}
```

### 3. Image Analysis

Analyze images with text prompts (multimodal).

**Endpoint:** `POST /api/gemini/analyze-image`

**Content-Type:** `multipart/form-data` or `application/json`

**Request (Form Data):**
```
image: [image file]
prompt: "What is in this image?"
model: "gemini-1.5-pro"
```

**Request (JSON with base64):**
```json
{
  "image": "base64_encoded_image_data",
  "prompt": "What is in this image?",
  "model": "gemini-1.5-pro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "analysis": "This image shows...",
    "confidence": 0.95
  }
}
```

### 4. Streaming

Stream text generation in real-time using Server-Sent Events (SSE).

**Endpoint:** `POST /api/gemini/stream`

**Request Body:**
```json
{
  "prompt": "Tell me a story",
  "model": "gemini-1.5-flash"
}
```

**Response (SSE Stream):**
```
data: {"chunk": "Once"}
data: {"chunk": " upon"}
data: {"chunk": " a"}
data: {"chunk": " time"}
data: {"done": true}
```

### 5. Function Calling

Execute Gemini function calling for structured outputs.

**Endpoint:** `POST /api/gemini/function-call`

**Request Body:**
```json
{
  "prompt": "What's the weather in San Francisco?",
  "functions": [
    {
      "name": "get_weather",
      "description": "Get the current weather for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state"
          }
        },
        "required": ["location"]
      }
    }
  ],
  "model": "gemini-1.5-pro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "functionCall": {
      "name": "get_weather",
      "arguments": {
        "location": "San Francisco, CA"
      }
    },
    "text": "I'll check the weather for San Francisco"
  }
}
```

### 6. Embeddings

Generate text embeddings for semantic search.

**Endpoint:** `POST /api/gemini/embeddings`

**Request Body:**
```json
{
  "text": "Hello world",
  "model": "text-embedding-004"
}
```

Or with multiple texts:
```json
{
  "text": ["Hello world", "Another text"],
  "model": "text-embedding-004"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "embeddings": [[0.1, 0.2, 0.3, ...]],
    "dimensions": 768
  }
}
```

### 7. Session Management

#### Get Session
**Endpoint:** `GET /api/gemini/sessions/:sessionId`

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "session-id",
    "messages": [...],
    "createdAt": 1234567890,
    "lastAccessedAt": 1234567890
  }
}
```

#### Delete Session
**Endpoint:** `DELETE /api/gemini/sessions/:sessionId`

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully",
  "data": {
    "deleted": true
  }
}
```

#### Clear All Sessions
**Endpoint:** `POST /api/gemini/sessions/clear`

**Response:**
```json
{
  "success": true,
  "message": "All sessions cleared successfully",
  "data": {
    "cleared": true
  }
}
```

### 8. Model Information

#### List Available Models
**Endpoint:** `GET /api/gemini/models`

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "models": [
      {
        "name": "models/gemini-1.5-pro",
        "displayName": "Gemini 1.5 Pro",
        "description": "...",
        "inputTokenLimit": 1048576,
        "outputTokenLimit": 8192
      }
    ]
  }
}
```

#### Get Model Info
**Endpoint:** `GET /api/gemini/models/:modelId`

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "name": "gemini-1.5-pro"
  }
}
```

## Usage Examples

### cURL Examples

#### Text Generation
```bash
curl -X POST https://localhost/api/gemini/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_secret_key_here" \
  -d '{
    "prompt": "Explain quantum computing in simple terms",
    "model": "gemini-1.5-flash"
  }'
```

#### Chat
```bash
curl -X POST https://localhost/api/gemini/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_secret_key_here" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"},
      {"role": "model", "content": "Hi! How can I help you?"},
      {"role": "user", "content": "Tell me a joke"}
    ]
  }'
```

#### Image Analysis
```bash
curl -X POST https://localhost/api/gemini/analyze-image \
  -H "x-api-key: your_secret_key_here" \
  -F "image=@/path/to/image.jpg" \
  -F "prompt=What is in this image?" \
  -F "model=gemini-1.5-pro"
```

### JavaScript/Fetch Examples

#### Text Generation
```javascript
const response = await fetch('https://localhost/api/gemini/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_secret_key_here'
  },
  body: JSON.stringify({
    prompt: 'Write a haiku about programming',
    model: 'gemini-1.5-flash'
  })
});

const data = await response.json();
console.log(data.data.text);
```

#### Streaming
```javascript
const response = await fetch('https://localhost/api/gemini/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_secret_key_here'
  },
  body: JSON.stringify({
    prompt: 'Tell me a story',
    model: 'gemini-1.5-flash'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.chunk) {
        console.log(data.chunk);
      }
    }
  }
}
```

### Python Examples

#### Text Generation
```python
import requests

url = "https://localhost/api/gemini/generate"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "your_secret_key_here"
}
data = {
    "prompt": "Explain machine learning",
    "model": "gemini-1.5-flash"
}

response = requests.post(url, json=data, headers=headers, verify=False)
result = response.json()
print(result['data']['text'])
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "prompt",
      "message": "Prompt is required"
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Project Structure

```
shintek/
├── config/
│   └── gemini.config.js       # Gemini configuration
├── controllers/
│   └── gemini.controller.js   # Request handlers
├── middleware/
│   ├── auth.middleware.js     # Authentication
│   ├── error.middleware.js    # Error handling
│   └── validation.middleware.js # Input validation
├── routes/
│   └── gemini.routes.js       # API routes
├── services/
│   ├── gemini.service.js      # Gemini AI integration
│   └── session.service.js     # Session management
├── utils/
│   ├── logger.util.js         # Logging
│   └── response.util.js       # Response formatting
├── .env                       # Environment variables
├── index.js                   # Main application
└── package.json               # Dependencies
```

## Notes

- Sessions are stored in memory and expire after 30 minutes of inactivity
- For production use, consider using Redis or a database for session storage
- Rate limiting is applied per IP address
- File uploads are limited to 10MB by default
- Supported image formats: JPEG, PNG, GIF, WebP
- All timestamps are in Unix epoch milliseconds

## Support

For issues or questions:
1. Check the error messages in the response
2. Review the server logs
3. Verify your API keys are correct
4. Ensure your request format matches the documentation

## License

ISC
