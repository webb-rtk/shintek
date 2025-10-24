/**
 * Simple logger utility
 */

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  const output = `[${timestamp}] [${level}] ${message}`;

  switch (level) {
    case logLevels.ERROR:
      console.error(output, meta);
      break;
    case logLevels.WARN:
      console.warn(output, meta);
      break;
    case logLevels.INFO:
      console.info(output, meta);
      break;
    case logLevels.DEBUG:
      console.log(output, meta);
      break;
    default:
      console.log(output, meta);
  }
};

const logger = {
  error: (message, meta) => log(logLevels.ERROR, message, meta),
  warn: (message, meta) => log(logLevels.WARN, message, meta),
  info: (message, meta) => log(logLevels.INFO, message, meta),
  debug: (message, meta) => log(logLevels.DEBUG, message, meta)
};

module.exports = logger;
