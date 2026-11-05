const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const contactRateLimiter = rateLimit({
  windowMs: env.contactRateLimit.windowMs,
  max: env.contactRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact submissions. Please try again later.',
    code: 'CONTACT_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = contactRateLimiter;
