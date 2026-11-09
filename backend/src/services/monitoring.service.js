/**
 * Optional error monitoring (Sentry). No-ops when SENTRY_DSN is unset.
 * Monitoring failures must never crash the application.
 */

const env = require('../config/env');
const logger = require('../utils/logger');

let sentry = null;
let initAttempted = false;
let initFailed = false;

function isEnabled() {
  return Boolean(process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).trim());
}

function initMonitoring() {
  if (initAttempted) {
    return Boolean(sentry);
  }
  initAttempted = true;

  if (!isEnabled()) {
    return false;
  }

  try {
    // Lazy require so local/dev without the package still boots if install failed.
    // eslint-disable-next-line global-require
    sentry = require('@sentry/node');
    sentry.init({
      dsn: process.env.SENTRY_DSN.trim(),
      environment: process.env.SENTRY_ENVIRONMENT || env.nodeEnv,
      release: process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) {
          if (event.request.headers) {
            for (const key of Object.keys(event.request.headers)) {
              if (/authorization|cookie|set-cookie|x-api-key/i.test(key)) {
                event.request.headers[key] = '[REDACTED]';
              }
            }
          }
          delete event.request.cookies;
          delete event.request.data;
        }
        return event;
      },
    });
    logger.info({
      type: 'monitoring',
      event: 'sentry_initialized',
      environment: process.env.SENTRY_ENVIRONMENT || env.nodeEnv,
    });
    return true;
  } catch (error) {
    initFailed = true;
    sentry = null;
    logger.warn({
      type: 'monitoring',
      event: 'sentry_init_failed',
      message: error && error.message ? error.message : 'init failed',
    });
    return false;
  }
}

function captureException(error, context = {}) {
  try {
    if (!sentry && isEnabled() && !initFailed) {
      initMonitoring();
    }
    if (!sentry) {
      return;
    }
    sentry.withScope((scope) => {
      if (context.requestId) scope.setTag('requestId', context.requestId);
      if (context.route) scope.setTag('route', context.route);
      if (context.statusCode) scope.setExtra('statusCode', context.statusCode);
      if (context.code) scope.setTag('errorCode', String(context.code));
      sentry.captureException(error);
    });
  } catch (_error) {
    // Never throw from monitoring.
  }
}

function flush(timeoutMs = 2000) {
  try {
    if (sentry && typeof sentry.flush === 'function') {
      return sentry.flush(timeoutMs);
    }
  } catch (_error) {
    // ignore
  }
  return Promise.resolve(false);
}

/** Test helper */
function resetMonitoringForTests() {
  sentry = null;
  initAttempted = false;
  initFailed = false;
}

module.exports = {
  isEnabled,
  initMonitoring,
  captureException,
  flush,
  resetMonitoringForTests,
};
