const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const newsletterRateLimiter = rateLimit({
  windowMs: env.newsletterRateLimit.windowMs,
  max: env.newsletterRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many newsletter requests. Please try again later.',
    code: 'NEWSLETTER_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = newsletterRateLimiter;
