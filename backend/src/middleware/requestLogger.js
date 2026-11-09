/**
 * Structured request logger with correlation IDs.
 * Does not log bodies, tokens, passwords, or authorization headers.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { redactUrl } = require('../utils/redact');

function resolveRequestId(req) {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && incoming.trim() && incoming.length <= 128) {
    return incoming.trim();
  }
  return crypto.randomUUID();
}

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const route = req.route && req.route.path ? req.route.path : undefined;

    logger.info({
      type: 'request',
      requestId,
      method: req.method,
      path: redactUrl(req.originalUrl),
      route,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}

module.exports = requestLogger;
