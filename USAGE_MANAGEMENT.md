# Chat API Usage Management Guide

## Current Limitations

### Rate Limiting
- **100 requests per 15 minutes** per IP address
- Applies to all `/api/gemini/*` endpoints
- Returns HTTP 429 when exceeded

### Session Storage
- **In-memory storage** (JavaScript Map)
- **30-minute timeout** for inactive sessions
- **Automatic cleanup** every 5 minutes
- **No hard limit** on number of sessions

### Google Gemini API Quotas (Free Tier)
- **15 RPM** (Requests Per Minute)
- **1,500 RPD** (Requests Per Day)
- **1 Million TPM** (Tokens Per Minute)

## What Happens with Heavy Usage

### Scenario 1: Single User Testing Repeatedly

**After 100 requests in 15 minutes:**
```
錯誤: Too many requests from this IP, please try again later.
```

**Solution for User:**
- Wait 15 minutes
- Use a different IP/network
- Contact admin to adjust rate limits

### Scenario 2: Long Conversations

**Problem:**
- Each message is stored in session
- Long conversations = large memory footprint
- Example: 100 messages × 500 chars = 50KB per session

**Current Behavior:**
- Session grows indefinitely during conversation
- Only cleared when:
  - User clicks "清除" button
  - Session inactive for 30 minutes
  - Server restarts

### Scenario 3: Many Concurrent Users

**Example: 50 users chatting simultaneously**

**Memory Usage:**
- 50 sessions × 10 messages × 500 chars = ~250KB (minimal)
- Plus Node.js overhead, Gemini responses, etc.
- Estimated: 5-10MB for 50 active users

**Google API Limits:**
- 15 requests/minute = only 15 users can send messages per minute
- Others will see quota errors

### Scenario 4: Hitting Google API Quota

**Daily Limit (1,500 requests):**
- With 100 users sending 15 messages each = quota exceeded
- Error: `Resource exhausted`
- All users affected until next day (resets at midnight PST)

**Per-Minute Limit (15 RPM):**
- Only 15 requests can succeed per minute
- 16th request gets rate limited by Google

## Monitoring Current Usage

### Check Session Stats

Add this endpoint to see current usage. Create a new file:

**File: `routes/admin.routes.js`**
```javascript
const express = require('express');
const router = express.Router();
const sessionService = require('../services/session.service');

// Get session statistics
router.get('/stats', (req, res) => {
  const stats = sessionService.getStats();
  const allSessions = Array.from(sessionService.sessions.values());

  const detailedStats = {
    totalSessions: stats.totalSessions,
    activeSessions: stats.activeSessions,
    totalMessages: allSessions.reduce((sum, s) => sum + s.messages.length, 0),
    averageMessagesPerSession: allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.messages.length, 0) / allSessions.length)
      : 0,
    oldestSession: allSessions.length > 0
      ? new Date(Math.min(...allSessions.map(s => s.createdAt))).toISOString()
      : null,
    newestSession: allSessions.length > 0
      ? new Date(Math.max(...allSessions.map(s => s.createdAt))).toISOString()
      : null
  };

  res.json(detailedStats);
});

module.exports = router;
```

Then add to `index.js`:
```javascript
const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);
```

Access: `https://localhost/admin/stats`

### Monitor Server Memory

Check Node.js memory usage:
```javascript
const used = process.memoryUsage();
console.log({
  rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
  heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`
});
```

## Solutions for Production

### 1. Adjust Rate Limits

**For lighter usage:**
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=50  # Reduced from 100
```

**For heavier usage (if you have paid Gemini API):**
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=500  # Increased
```

**Per-user rate limiting:**
Implement session-based or user-based rate limiting instead of IP-based.

### 2. Limit Conversation Length

Add to `services/session.service.js`:

```javascript
addMessage(sessionId, role, content) {
  const session = this.getSession(sessionId);
  if (!session) {
    throw new Error('Session not found or expired');
  }

  // Limit conversation history to last 20 messages
  if (session.messages.length >= 20) {
    session.messages.shift(); // Remove oldest message
  }

  session.messages.push({ role, content });
  session.lastAccessedAt = Date.now();
  this.sessions.set(sessionId, session);
  return session;
}
```

### 3. Use Redis for Session Storage

**Why Redis?**
- Faster than in-memory for large scale
- Persistent across server restarts
- Supports automatic expiration
- Can be shared across multiple servers

**Install Redis:**
```bash
npm install redis
```

**Update session service:**
```javascript
const redis = require('redis');
const client = redis.createClient();

// Store session
await client.setEx(`session:${sessionId}`, 1800, JSON.stringify(session));

// Get session
const data = await client.get(`session:${sessionId}`);
const session = JSON.parse(data);
```

### 4. Implement Queue System

For high traffic, queue requests to avoid hitting Google API limits:

```bash
npm install bull redis
```

```javascript
const Queue = require('bull');
const chatQueue = new Queue('chat', 'redis://127.0.0.1:6379');

// Add to queue
chatQueue.add({ sessionId, message }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Process queue (rate limited)
chatQueue.process(15, async (job) => {
  // Process chat request
  // Only 15 concurrent jobs
});
```

### 5. Add User-Friendly Limits

**Show remaining requests:**
```javascript
res.setHeader('X-RateLimit-Limit', '100');
res.setHeader('X-RateLimit-Remaining', remaining);
res.setHeader('X-RateLimit-Reset', resetTime);
```

**Update UI to show:**
- "You have 45 requests remaining"
- "Rate limit resets in 8 minutes"

**Add conversation limit:**
```
"對話已達 20 條訊息上限。請點擊「清除」開始新對話。"
```

### 6. Upgrade Google API Plan

**Free Tier:**
- 15 RPM, 1,500 RPD

**Pay-as-you-go:**
- 360 RPM, 10,000 RPD
- $0.125 per 1M input tokens
- $0.375 per 1M output tokens

### 7. Add Caching

Cache common responses:

```javascript
const cache = new Map();

// Before calling Gemini API
const cacheKey = `chat:${messageHash}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

// After getting response
cache.set(cacheKey, response);
```

### 8. Implement Graceful Degradation

```javascript
try {
  const response = await geminiService.chat(messages);
  return response;
} catch (error) {
  if (error.message.includes('quota')) {
    return {
      reply: '抱歉，AI 服務目前繁忙。請稍後再試。',
      sessionId,
      isError: true
    };
  }
  throw error;
}
```

## Recommended Configuration

### Development (Current)
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```
- Good for testing
- Low traffic
- Single developer

### Small Production (< 100 daily users)
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=50
```
- Add conversation length limit (20 messages)
- Monitor daily quota usage
- Keep in-memory sessions

### Medium Production (100-1000 daily users)
```env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=30
```
- Implement Redis for sessions
- Add queue system
- Consider upgrading Google API plan
- Add user authentication
- Implement per-user rate limiting

### Large Production (1000+ daily users)
- Load balancer with multiple servers
- Redis cluster for sessions
- Queue system with priority
- Paid Google API with higher quotas
- Advanced caching strategy
- Real-time monitoring and alerting
- Per-user rate limiting
- Optional: Implement your own AI model

## Monitoring Alerts

Set up alerts for:
- Memory usage > 80%
- Session count > 100
- Rate limit hits > 10/hour
- Google API quota > 80%
- Error rate > 5%

## Cost Estimation (Paid API)

**Assumptions:**
- 1,000 users per day
- 10 messages per user
- 50 tokens per message (input)
- 150 tokens per response (output)

**Calculation:**
- Input: 1,000 × 10 × 50 = 500,000 tokens/day
- Output: 1,000 × 10 × 150 = 1,500,000 tokens/day

**Monthly Cost:**
- Input: 500K × 30 = 15M tokens = $1.88/month
- Output: 1.5M × 30 = 45M tokens = $16.88/month
- **Total: ~$19/month**

## Best Practices

1. ✅ Start with conservative rate limits
2. ✅ Monitor usage regularly
3. ✅ Set up logging for all API calls
4. ✅ Implement graceful error handling
5. ✅ Cache common responses
6. ✅ Limit conversation length
7. ✅ Use session expiration
8. ✅ Consider Redis for production
9. ✅ Plan for quota limits
10. ✅ Have fallback messages ready

## Summary

**Current Setup:**
- ✅ Good for development and testing
- ✅ Handles ~100 requests per user per 15 minutes
- ⚠️ Limited to 1,500 total requests per day (Google quota)
- ⚠️ Memory-based sessions (lost on restart)

**For Production:**
- Implement Redis
- Add conversation limits
- Consider paid API
- Add monitoring
- Implement queuing for high traffic
