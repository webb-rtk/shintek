/**
 * Simple logger utility with file logging support
 */

const fs = require('fs');
const path = require('path');

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Log directory and file configuration
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Write log entry to file
 */
const writeToFile = (filePath, logLine) => {
  fs.appendFile(filePath, logLine + '\n', (err) => {
    if (err) {
      console.error('Failed to write to log file:', err.message);
    }
  });
};

/**
 * Get today's date string for log rotation
 */
const getDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Get daily log file path
 */
const getDailyLogFile = () => {
  return path.join(LOG_DIR, `app-${getDateString()}.log`);
};

const getDailyErrorLogFile = () => {
  return path.join(LOG_DIR, `error-${getDateString()}.log`);
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
  const output = `[${timestamp}] [${level}] ${message}${metaString}`;

  // Write to daily log file
  writeToFile(getDailyLogFile(), output);

  // Also write errors to separate error log
  if (level === logLevels.ERROR) {
    writeToFile(getDailyErrorLogFile(), output);
  }

  // Also output to console for real-time monitoring
  switch (level) {
    case logLevels.ERROR:
      console.error(output);
      break;
    case logLevels.WARN:
      console.warn(output);
      break;
    case logLevels.INFO:
      console.info(output);
      break;
    case logLevels.DEBUG:
      console.log(output);
      break;
    default:
      console.log(output);
  }
};

const logger = {
  error: (message, meta) => log(logLevels.ERROR, message, meta),
  warn: (message, meta) => log(logLevels.WARN, message, meta),
  info: (message, meta) => log(logLevels.INFO, message, meta),
  debug: (message, meta) => log(logLevels.DEBUG, message, meta)
};

module.exports = logger;
