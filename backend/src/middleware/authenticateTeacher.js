const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { verifyTeacherAccessToken, ACTORS } = require('../utils/token');
const { notDeleted } = require('../utils/softDelete');
const asyncHandler = require('./asyncHandler');
const { extractBearerToken } = require('./authenticate');

function toAuthTeacher(teacher) {
  return {
    id: teacher.id,
    email: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    employeeCode: teacher.employeeCode,
    isActive: teacher.isActive,
    tokenVersion: teacher.tokenVersion,
    lastLoginAt: teacher.lastLoginAt,
  };
}

const authenticateTeacher = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  const payload = verifyTeacherAccessToken(token);
  const teacherId = Number(payload.sub);

  if (
    payload.actor !== ACTORS.TEACHER ||
    !Number.isInteger(teacherId) ||
    teacherId <= 0
  ) {
    throw new AppError('Invalid authentication token.', 401, {
      code: 'TOKEN_INVALID',
    });
  }

  const teacher = await prisma.teacher.findFirst({
    where: notDeleted({ id: teacherId }),
  });

  if (!teacher || !teacher.isActive) {
    throw new AppError('Authentication required.', 401, {
      code: 'UNAUTHORIZED',
    });
  }

  if (payload.tokenVersion !== teacher.tokenVersion) {
    throw new AppError('Authentication token is no longer valid.', 401, {
      code: 'TOKEN_REVOKED',
    });
  }

  req.teacher = toAuthTeacher(teacher);
  next();
});

module.exports = authenticateTeacher;
