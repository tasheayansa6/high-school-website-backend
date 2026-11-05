const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const admissionsRateLimiter = rateLimit({
  windowMs: env.admissionsRateLimit.windowMs,
  max: env.admissionsRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admissions inquiries. Please try again later.',
    code: 'ADMISSIONS_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = admissionsRateLimiter;
