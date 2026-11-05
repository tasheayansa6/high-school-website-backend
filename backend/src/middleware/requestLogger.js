/**
 * Lightweight request logger.
 * Does not log bodies, headers, tokens, or passwords.
 */
function redactSensitiveQuery(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') {
    return urlPath;
  }

  return urlPath.replace(/([?&]token=)[^&]*/gi, '$1[REDACTED]');
}

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    console.log(
      JSON.stringify({
        type: 'request',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: redactSensitiveQuery(req.originalUrl),
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      })
    );
  });

  next();
}

module.exports = requestLogger;
