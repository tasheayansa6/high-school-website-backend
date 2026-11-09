const { prisma } = require('../config/database');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { comparePassword } = require('../utils/password');
const { signStudentAccessToken } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const { toPublicStudent } = require('../utils/smsSerializers');
const { recordAudit } = require('./audit.service');

const GENERIC_AUTH_FAILURE = 'Invalid credentials.';

function invalidCredentials() {
  return new AppError(GENERIC_AUTH_FAILURE, 401, {
    code: 'INVALID_CREDENTIALS',
  });
}

async function login({ email, studentCode, password }, requestMeta = {}) {
  const identity = email
    ? { email: email.toLowerCase() }
    : { studentCode: String(studentCode).trim() };

  const student = await prisma.student.findFirst({
    where: notDeleted(identity),
  });

  if (!student || !student.isActive) {
    throw invalidCredentials();
  }

  const passwordMatches = await comparePassword(password, student.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    studentId: updated.id,
    action: 'student.login',
    entityType: 'Student',
    entityId: updated.id,
    ipAddress: requestMeta.ipAddress,
  });

  const accessToken = signStudentAccessToken({
    studentId: updated.id,
    tokenVersion: updated.tokenVersion,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: env.jwt.expiresIn,
    student: toPublicStudent(updated),
  };
}

async function getProfile(studentId) {
  const student = await prisma.student.findFirst({
    where: notDeleted({ id: studentId }),
  });

  if (!student || !student.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  return toPublicStudent(student);
}

/**
 * Logout increments tokenVersion so existing student JWTs fail authentication.
 */
async function logout(studentId, requestMeta = {}) {
  const student = await prisma.student.findFirst({
    where: notDeleted({ id: studentId }),
  });

  if (!student || !student.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { tokenVersion: { increment: 1 } },
  });

  await recordAudit({
    studentId: student.id,
    action: 'student.logout',
    entityType: 'Student',
    entityId: student.id,
    ipAddress: requestMeta.ipAddress,
  });

  return true;
}

module.exports = {
  login,
  getProfile,
  logout,
};
