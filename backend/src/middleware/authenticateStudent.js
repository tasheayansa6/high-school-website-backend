const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { verifyStudentAccessToken, ACTORS } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const asyncHandler = require('./asyncHandler');
const { extractBearerToken } = require('./authenticate');

function toAuthStudent(student) {
  return {
    id: student.id,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    studentCode: student.studentCode,
    isActive: student.isActive,
    tokenVersion: student.tokenVersion,
    lastLoginAt: student.lastLoginAt,
  };
}

const authenticateStudent = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  const payload = verifyStudentAccessToken(token);
  const studentId = Number(payload.sub);

  if (
    payload.actor !== ACTORS.STUDENT ||
    !Number.isInteger(studentId) ||
    studentId <= 0
  ) {
    throw new AppError('Invalid authentication token.', 401, {
      code: 'TOKEN_INVALID',
    });
  }

  const student = await prisma.student.findFirst({
    where: notDeleted({ id: studentId }),
  });

  if (!student || !student.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  if (payload.tokenVersion !== student.tokenVersion) {
    throw new AppError('Authentication token is no longer valid.', 401, {
      code: 'TOKEN_REVOKED',
    });
  }

  req.student = toAuthStudent(student);
  next();
});

module.exports = authenticateStudent;
