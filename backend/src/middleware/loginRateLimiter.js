const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const loginRateLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMs,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = loginRateLimiter;
