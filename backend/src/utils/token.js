const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('./AppError');

function signAccessToken({ adminId, tokenVersion }) {
  return jwt.sign(
    {
      sub: adminId,
      tokenVersion,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.secret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Authentication token has expired.', 401, {
        code: 'TOKEN_EXPIRED',
      });
    }

    throw new AppError('Invalid authentication token.', 401, {
      code: 'TOKEN_INVALID',
    });
  }
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
