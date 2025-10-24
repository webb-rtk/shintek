/**
 * Simple test script for Gemini API endpoints
 * Make sure to set your GEMINI_API_KEY and API_SECRET_KEY in .env before running
 */

require('dotenv').config();
const https = require('https');

// Disable SSL verification for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE_URL = 'https://localhost:443/api/gemini';
const API_KEY = process.env.API_SECRET_KEY;

async function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + endpoint);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testTextGeneration() {
  console.log('\n=== Testing Text Generation ===');
  try {
    const response = await makeRequest('/generate', 'POST', {
      prompt: 'Write a short haiku about artificial intelligence'
    });
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    if (response.data.success) {
      console.log('✓ Text Generation: PASSED');
      return true;
    }
  } catch (error) {
    console.error('✗ Text Generation: FAILED', error.message);
  }
  return false;
}

async function testChat() {
  console.log('\n=== Testing Chat ===');
  try {
    const response = await makeRequest('/chat', 'POST', {
      messages: [
        { role: 'user', content: 'Say hello in 3 words' }
      ]
    });
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    if (response.data.success) {
      console.log('✓ Chat: PASSED');
      return response.data.data.sessionId;
    }
  } catch (error) {
    console.error('✗ Chat: FAILED', error.message);
  }
  return null;
}

async function testGetSession(sessionId) {
  console.log('\n=== Testing Get Session ===');
  try {
    const response = await makeRequest(`/sessions/${sessionId}`, 'GET');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    if (response.data.success) {
      console.log('✓ Get Session: PASSED');
      return true;
    }
  } catch (error) {
    console.error('✗ Get Session: FAILED', error.message);
  }
  return false;
}

async function testListModels() {
  console.log('\n=== Testing List Models ===');
  try {
    const response = await makeRequest('/models', 'GET');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    if (response.data.success) {
      console.log('✓ List Models: PASSED');
      return true;
    }
  } catch (error) {
    console.error('✗ List Models: FAILED', error.message);
  }
  return false;
}

async function testEmbeddings() {
  console.log('\n=== Testing Embeddings ===');
  try {
    const response = await makeRequest('/embeddings', 'POST', {
      text: 'Hello world'
    });
    console.log('Status:', response.status);
    console.log('Embeddings dimensions:', response.data.data?.dimensions);
    if (response.data.success) {
      console.log('✓ Embeddings: PASSED');
      return true;
    }
  } catch (error) {
    console.error('✗ Embeddings: FAILED', error.message);
  }
  return false;
}

async function runTests() {
  console.log('Starting API Tests...');
  console.log('API Base URL:', API_BASE_URL);
  console.log('API Key:', API_KEY ? '***' + API_KEY.slice(-4) : 'NOT SET');

  if (!API_KEY) {
    console.error('\n❌ ERROR: API_SECRET_KEY not set in .env file');
    console.error('Please set API_SECRET_KEY in your .env file before running tests.');
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ ERROR: GEMINI_API_KEY not set in .env file');
    console.error('Please get your API key from https://makersuite.google.com/app/apikey');
    return;
  }

  let passed = 0;
  let total = 0;

  // Test 1: Text Generation
  total++;
  if (await testTextGeneration()) passed++;

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Chat
  total++;
  const sessionId = await testChat();
  if (sessionId) passed++;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Get Session (only if chat created a session)
  if (sessionId) {
    total++;
    if (await testGetSession(sessionId)) passed++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test 4: List Models
  total++;
  if (await testListModels()) passed++;

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Embeddings
  total++;
  if (await testEmbeddings()) passed++;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests completed: ${passed}/${total} passed`);
  console.log('='.repeat(50));

  if (passed === total) {
    console.log('✓ All tests passed!');
  } else {
    console.log(`✗ ${total - passed} test(s) failed`);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
});
