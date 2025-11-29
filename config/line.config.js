require('dotenv').config();

// Configuration for multiple LINE bots
const bots = {
  // First bot (existing)
  bot1: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  },
  // Second bot - add credentials in .env file
  bot2: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN_2,
    channelSecret: process.env.LINE_CHANNEL_SECRET_2,
  }
};

// Legacy single bot config (for backward compatibility)
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Map destination (bot user ID) to bot configuration
// You'll need to fill in the actual bot user IDs from LINE
const destinationToBotMap = {
  // Format: 'bot_user_id': 'bot1' or 'bot2'
  // Example: 'Udeadbeef1234567890': 'bot1',
  // Get bot IDs using /showid command in LINE chat
};

// Get bot config by destination ID
function getBotConfig(destination) {
  const botKey = destinationToBotMap[destination];
  if (botKey && bots[botKey]) {
    return bots[botKey];
  }
  // Fallback to first bot config
  return bots.bot1;
}

// Get all bot configs as array
function getAllBotConfigs() {
  return Object.values(bots).filter(bot => bot.channelSecret && bot.channelAccessToken);
}

module.exports = {
  ...lineConfig, // Legacy export
  bots,
  getBotConfig,
  getAllBotConfigs,
  destinationToBotMap
};
