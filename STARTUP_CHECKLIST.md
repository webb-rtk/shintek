# Server Startup Checklist

Before testing the AI Chat feature, make sure you complete these steps:

## 1. Environment Configuration ✓

Check your `.env` file has:
```env
GEMINI_API_KEY=AIzaSyCPNnj4Xn5JePF6KDwPuusNl3GGpAk5C8U
NODE_ENV=development
API_SECRET_KEY=your_secret_key_here
```

## 2. Stop Any Running Server

If the server is already running:
- Press `Ctrl + C` in the terminal to stop it
- Or close the terminal window
- Or use Task Manager to kill the Node.js process

## 3. Start the Server

```bash
node index.js
```

Or:

```bash
npm start
```

## 4. Verify Server is Running

You should see output like:
```
[2025-XX-XX XX:XX:XX.XXX] [INFO] Gemini AI API routes initialized
HTTP server listening-2: http://localhost
[2025-XX-XX XX:XX:XX.XXX] [INFO] HTTP server started on port 80 (redirects to HTTPS)
Example app listening at https://localhost:443
[2025-XX-XX XX:XX:XX.XXX] [INFO] HTTPS server started on port 443
[2025-XX-XX XX:XX:XX.XXX] [INFO] Gemini AI API available at /api/gemini
[2025-XX-XX XX:XX:XX.XXX] [WARN] API authentication disabled in development mode (no valid API_SECRET_KEY set)
```

## 5. Test the Configuration

### Quick Test - Check Model

```bash
node debug-api-key.js
```

Should output:
```
Testing: gemini-2.0-flash-exp
  ✓ SUCCESS! Response: "Hello"
  This model is working!
```

### Full API Test

```bash
node test-api.js
```

Expected results:
- ✓ Text Generation: PASSED
- ✓ Chat: PASSED
- ✓ List Models: PASSED
- ✓ Embeddings: PASSED

## 6. Test the Chat Interface

1. Open browser: `https://localhost`
2. Click "AI 對話" in the menu
3. Type a message: "你好"
4. Press Enter or click "發送"
5. You should see a response from the AI

## Troubleshooting

### Server won't start

**Error: Port already in use**
```
Error: listen EADDRINUSE: address already in use :::443
```

Solution:
- Find and kill the process using port 443:
  ```bash
  netstat -ano | findstr :443
  taskkill /PID <PID_NUMBER> /F
  ```

**Error: Certificate files not found**
```
Error: ENOENT: no such file or directory, open 'growingtek.com.tw/private.key'
```

Solution:
- Make sure SSL certificate files exist
- Or temporarily disable HTTPS in `index.js`:
  ```javascript
  var use_https = false;
  ```

### Chat shows "Validation failed"

This means the server needs to be restarted with the updated code.

1. Stop the server (Ctrl + C)
2. Start it again: `node index.js`
3. Clear browser cache (Ctrl + Shift + Delete)
4. Reload the page (Ctrl + F5)

### Chat shows "連接錯誤"

1. Check server is running
2. Check browser console (F12 > Console)
3. Look for CORS or network errors
4. Verify you're accessing via HTTPS

### API responds but chat doesn't update

1. Open browser console (F12)
2. Look for JavaScript errors
3. Check Network tab for API responses
4. Make sure there are no ad blockers interfering

## Current Configuration

✅ **Model**: `gemini-2.0-flash-exp`
✅ **Authentication**: Disabled in development
✅ **Rate Limit**: 100 requests per 15 minutes
✅ **CORS**: Enabled for all origins
✅ **HTTPS**: Enabled

## Important Notes

⚠️ **Always restart the server** after making changes to:
- Configuration files (`config/*.js`)
- Service files (`services/*.js`)
- Middleware files (`middleware/*.js`)
- Route files (`routes/*.js`)

⚠️ **Clear browser cache** if you update:
- HTML files
- JavaScript in HTML
- CSS styles

💡 **Tip**: Use `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac) to hard reload the page without cache.

## Success Criteria

Your setup is working correctly when:

1. ✅ Server starts without errors
2. ✅ `debug-api-key.js` shows model working
3. ✅ `test-api.js` passes at least 3/4 tests
4. ✅ Website loads at `https://localhost`
5. ✅ Chat interface appears when clicking "AI 對話"
6. ✅ AI responds to messages

If all checks pass, you're ready to use the AI chat feature! 🎉
