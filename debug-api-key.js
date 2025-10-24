/**
 * Debug script to check API key and available models
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET');
  console.log('API Key Length:', apiKey ? apiKey.length : 0);
  console.log();

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ ERROR: Please set a valid GEMINI_API_KEY in your .env file');
    console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Try to list models using the correct method
  console.log('Attempting to call Google AI API directly...\n');

  // Test with a simple model name
  const testModels = [
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'learnlm-1.5-pro-experimental'
  ];

  for (const modelName of testModels) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hi in one word');
      const text = result.response.text();
      console.log(`  ✓ SUCCESS! Response: "${text}"`);
      console.log(`  This model is working! Update your config to use: ${modelName}\n`);
      return; // Found a working model
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message.split('\n')[0]}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n❌ No working models found.');
  console.log('\nPossible issues:');
  console.log('1. Your API key might be invalid or expired');
  console.log('2. Your API key might have billing issues');
  console.log('3. The Gemini API might be unavailable in your region');
  console.log('4. You need to enable the Generative Language API');
  console.log('\nPlease visit: https://aistudio.google.com/app/apikey');
  console.log('And ensure you have:');
  console.log('- Created a valid API key');
  console.log('- Enabled billing (if required)');
  console.log('- Accepted terms of service');
}

main().catch(console.error);
