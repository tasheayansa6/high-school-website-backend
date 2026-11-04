/**
 * Lightweight request logger.
 * Does not log bodies, headers, tokens, or passwords.
 */
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    console.log(
      JSON.stringify({
        type: 'request',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      })
    );
  });

  next();
}

module.exports = requestLogger;
