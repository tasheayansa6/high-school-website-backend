const { Prisma } = require('@prisma/client');
const AppError = require('../../utils/AppError');

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function isUniqueViolation(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function notFound(label, code) {
  return new AppError(`${label} not found.`, 404, { code });
}

function conflict(message, code) {
  return new AppError(message, 409, { code });
}

function validationFailure(message, field) {
  return new AppError(message, 422, {
    code: 'VALIDATION_ERROR',
    errors: [{ field, message }],
  });
}

function getIp(requestMeta = {}) {
  return requestMeta.ipAddress || null;
}

function whereWithDeleted(where, includeDeleted) {
  return includeDeleted ? { ...where } : { ...where, deletedAt: null };
}

module.exports = {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  validationFailure,
  getIp,
  whereWithDeleted,
};
