const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const mediaRateLimiter = rateLimit({
  windowMs: env.mediaRateLimit.windowMs,
  max: env.mediaRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many media upload requests. Please try again later.',
    code: 'MEDIA_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = mediaRateLimiter;
