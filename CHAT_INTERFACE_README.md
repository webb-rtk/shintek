# AI Chat Interface Guide

## Overview

Your website now includes an interactive AI chat interface powered by Google Gemini AI. Users can have natural conversations with the AI assistant directly from your website.

## How to Use

### 1. Start the Server

Make sure your server is running:

```bash
npm start
```

The server should display:
```
HTTPS server started on port 443
Gemini AI API available at /api/gemini
```

### 2. Access the Chat Interface

1. Open your website: `https://localhost` (or your domain)
2. Click on the **"AI 對話"** menu item in the navigation bar
3. The chat interface will appear

### 3. Chat with AI

- Type your message in the input box at the bottom
- Press **Enter** or click the **"發送"** (Send) button
- The AI will respond to your message
- Continue the conversation - the AI remembers the context!

### 4. Clear Conversation

Click the **"清除"** (Clear) button to start a fresh conversation.

## Features

✅ **Natural Language**: Chat in Chinese or English
✅ **Context Awareness**: AI remembers previous messages in the conversation
✅ **Session Management**: Each conversation maintains its context
✅ **Real-time Responses**: Get instant replies from Gemini AI
✅ **User-Friendly Interface**: Clean, modern chat design

## Technical Details

### API Endpoint Used

The chat interface calls: `POST /api/gemini/chat`

### Request Format

```json
{
  "messages": [
    { "role": "user", "content": "Your message here" }
  ],
  "sessionId": "optional-session-id"
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "reply": "AI response here",
    "sessionId": "abc-123-def",
    "conversationHistory": [...]
  }
}
```

## Configuration

### Development Mode

In development mode (`NODE_ENV=development`), the API does not require authentication if `API_SECRET_KEY` is not set or is the default value.

### Production Mode

For production, you should:

1. Set a strong `API_SECRET_KEY` in `.env`
2. Update the chat interface to include the API key in requests
3. Consider rate limiting per user/IP
4. Add CORS restrictions for your domain only

## Security Considerations

### Current Setup (Development)

- ✅ HTTPS enabled
- ✅ Rate limiting active (100 requests per 15 minutes)
- ⚠️ Authentication disabled for development

### Recommended for Production

1. **Enable Authentication**
   ```env
   API_SECRET_KEY=your_strong_random_key_here
   ```

2. **Update CORS Settings** in `index.js`:
   ```javascript
   app.use(cors({
     origin: 'https://yourdomain.com',
     methods: ['GET', 'POST'],
     allowedHeaders: ['Content-Type', 'x-api-key']
   }));
   ```

3. **Implement User Rate Limiting**
   - Track requests per user session
   - Add CAPTCHA for excessive use
   - Monitor for abuse

4. **Content Filtering**
   - Consider adding input validation
   - Filter inappropriate content
   - Log conversations for moderation

## Customization

### Change AI Model

Edit `config/gemini.config.js`:

```javascript
models: {
  flash: 'gemini-2.0-flash-exp',  // Change this to use different model
  // ...
}
```

### Adjust Chat Appearance

Edit the CSS in `shintek.html` within the `<style>` tags. Look for classes like:
- `.chat-container` - Main container styling
- `.chat-messages` - Chat history area
- `.message.user` - User message bubbles
- `.message.bot` - AI message bubbles
- `.chat-button` - Button styling

### Change Welcome Message

Edit `shintek.html` line ~293:

```html
<div class="message bot">您的自定義歡迎訊息</div>
```

## Troubleshooting

### Chat not responding

1. **Check server is running**
   ```bash
   # Look for this in console
   HTTPS server started on port 443
   ```

2. **Check Gemini API key**
   ```bash
   # In .env file
   GEMINI_API_KEY=AIzaSy...
   ```

3. **Check browser console** (F12 > Console tab)
   - Look for any error messages
   - Check network requests

### Authentication errors

If you see `401 Unauthorized`:

1. Make sure `NODE_ENV=development` in `.env`
2. Or set a valid `API_SECRET_KEY` and include it in requests

### API rate limit exceeded

If you see `429 Too Many Requests`:

1. Wait 15 minutes
2. Or adjust rate limits in `.env`:
   ```env
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX_REQUESTS=100
   ```

## Example Conversations

Try asking the AI:

- **General Knowledge**: "什麼是人工智能？" (What is AI?)
- **Technical Help**: "如何學習程式設計？" (How to learn programming?)
- **Creative Tasks**: "寫一首關於科技的詩" (Write a poem about technology)
- **Problem Solving**: "幫我解決這個數學問題..." (Help me solve this math problem...)

## API Usage Monitoring

Monitor your API usage at:
- [Google AI Studio](https://aistudio.google.com/)

Check for:
- Request count
- Token usage
- Error rates
- Billing (if applicable)

## Support

For issues or questions:
1. Check server logs for errors
2. Review the API documentation in `GEMINI_API_README.md`
3. Test the API directly using `node test-api.js`

---

**Note**: This chat interface is powered by Google Gemini AI. Make sure you comply with Google's terms of service and usage policies.
