/**
 * Check which Gemini models are actually available with your API key
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say hi');
    const response = result.response.text();
    return { available: true, response: response.substring(0, 50) };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

async function main() {
  console.log('Checking available Gemini models...\n');

  const modelsToCheck = [
    'gemini-pro',
    'models/gemini-pro',
    'gemini-1.5-pro',
    'models/gemini-1.5-pro',
    'gemini-1.5-flash',
    'models/gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'models/gemini-1.5-flash-8b'
  ];

  for (const modelName of modelsToCheck) {
    console.log(`Testing: ${modelName}`);
    const result = await checkModel(modelName);

    if (result.available) {
      console.log(`  ✓ AVAILABLE - Response: "${result.response}..."`);
    } else {
      console.log(`  ✗ NOT AVAILABLE - ${result.error.split('\n')[0]}`);
    }
    console.log();

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nRecommendation:');
  console.log('Update config/gemini.config.js to use the models marked as AVAILABLE above.');
}

main().catch(console.error);
