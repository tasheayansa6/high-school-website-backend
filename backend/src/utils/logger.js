/**
 * Structured JSON logger for Railway-compatible stdout collection.
 * Never accepts or prints secrets; callers must redact before logging.
 */

const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

const configuredLevel = String(process.env.LOG_LEVEL || 'info')
  .trim()
  .toLowerCase();
const minLevel = LEVELS[configuredLevel] || LEVELS.info;

function write(level, fields = {}) {
  if ((LEVELS[level] || 0) < minLevel) {
    return;
  }

  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

const logger = {
  debug(fields) {
    write('debug', fields);
  },
  info(fields) {
    write('info', fields);
  },
  warn(fields) {
    write('warn', fields);
  },
  error(fields) {
    write('error', fields);
  },
};

module.exports = logger;
