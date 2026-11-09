const { prisma } = require('../config/database');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { comparePassword } = require('../utils/password');
const { signTeacherAccessToken } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const { toPublicTeacher } = require('../utils/smsSerializers');
const { recordAudit } = require('./audit.service');

const GENERIC_AUTH_FAILURE = 'Invalid email or password.';

function invalidCredentials() {
  return new AppError(GENERIC_AUTH_FAILURE, 401, {
    code: 'INVALID_CREDENTIALS',
  });
}

async function login({ email, password }, requestMeta = {}) {
  const teacher = await prisma.teacher.findFirst({
    where: notDeleted({ email: email.toLowerCase() }),
  });

  if (!teacher || !teacher.isActive) {
    throw invalidCredentials();
  }

  const passwordMatches = await comparePassword(password, teacher.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const updated = await prisma.teacher.update({
    where: { id: teacher.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    teacherId: updated.id,
    action: 'teacher.login',
    entityType: 'Teacher',
    entityId: updated.id,
    ipAddress: requestMeta.ipAddress,
  });

  const accessToken = signTeacherAccessToken({
    teacherId: updated.id,
    tokenVersion: updated.tokenVersion,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: env.jwt.expiresIn,
    teacher: toPublicTeacher(updated),
  };
}

async function getProfile(teacherId) {
  const teacher = await prisma.teacher.findFirst({
    where: notDeleted({ id: teacherId }),
  });

  if (!teacher || !teacher.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  return toPublicTeacher(teacher);
}

/**
 * Logout increments tokenVersion so existing teacher JWTs fail authentication.
 */
async function logout(teacherId, requestMeta = {}) {
  const teacher = await prisma.teacher.findFirst({
    where: notDeleted({ id: teacherId }),
  });

  if (!teacher || !teacher.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { tokenVersion: { increment: 1 } },
  });

  await recordAudit({
    teacherId: teacher.id,
    action: 'teacher.logout',
    entityType: 'Teacher',
    entityId: teacher.id,
    ipAddress: requestMeta.ipAddress,
  });

  return true;
}

module.exports = {
  login,
  getProfile,
  logout,
};
