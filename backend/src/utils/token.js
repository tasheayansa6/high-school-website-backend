const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('./AppError');

const ACTORS = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
});

function audienceForActor(actor) {
  if (actor === ACTORS.TEACHER) return env.jwt.teacherAudience;
  if (actor === ACTORS.STUDENT) return env.jwt.studentAudience;
  return env.jwt.audience;
}

function signAccessToken({ adminId, tokenVersion }) {
  return jwt.sign(
    {
      sub: adminId,
      actor: ACTORS.ADMIN,
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

function signTeacherAccessToken({ teacherId, tokenVersion }) {
  return jwt.sign(
    {
      sub: teacherId,
      actor: ACTORS.TEACHER,
      tokenVersion,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.teacherAudience,
    }
  );
}

function signStudentAccessToken({ studentId, tokenVersion }) {
  return jwt.sign(
    {
      sub: studentId,
      actor: ACTORS.STUDENT,
      tokenVersion,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.studentAudience,
    }
  );
}

function verifyAccessToken(token, expectedAudience = env.jwt.audience) {
  try {
    return jwt.verify(token, env.jwt.secret, {
      issuer: env.jwt.issuer,
      audience: expectedAudience,
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

function verifyTeacherAccessToken(token) {
  return verifyAccessToken(token, env.jwt.teacherAudience);
}

function verifyStudentAccessToken(token) {
  return verifyAccessToken(token, env.jwt.studentAudience);
}

module.exports = {
  ACTORS,
  audienceForActor,
  signAccessToken,
  signTeacherAccessToken,
  signStudentAccessToken,
  verifyAccessToken,
  verifyTeacherAccessToken,
  verifyStudentAccessToken,
};
