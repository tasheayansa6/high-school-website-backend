const { Prisma } = require('@prisma/client');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { redactUrl } = require('../utils/redact');
const monitoring = require('../services/monitoring.service');

function mapPrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new AppError('A record with this value already exists.', 409, {
          code: 'UNIQUE_CONSTRAINT',
        });
      case 'P2025':
        return new AppError('Requested record was not found.', 404, {
          code: 'RECORD_NOT_FOUND',
        });
      case 'P2003':
        return new AppError('Related record constraint failed.', 409, {
          code: 'FOREIGN_KEY_CONSTRAINT',
        });
      default:
        return new AppError('A database error occurred.', 500, {
          code: 'DATABASE_ERROR',
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid database query.', 400, {
      code: 'DATABASE_VALIDATION_ERROR',
    });
  }

  return null;
}

function logError(error, req) {
  const statusCode = error.statusCode || error.status || 500;
  const safeLog = {
    type: 'request_error',
    requestId: req.requestId || null,
    method: req.method,
    path: redactUrl(req.originalUrl),
    statusCode,
    code: error.code || error.name || null,
    message: error.isOperational ? error.message : 'Non-operational error',
  };

  if (!env.isProduction && !error.isOperational) {
    logger.error({ ...safeLog, stack: error.stack || null });
    return;
  }

  logger.error(safeLog);
}

function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof AppError)) {
    const prismaMapped = mapPrismaError(error);
    if (prismaMapped) {
      error = prismaMapped;
    }
  }

  if (error.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON payload.', 400, {
      code: 'INVALID_JSON',
    });
  }

  if (error.name === 'ZodError') {
    error = new AppError('Validation failed.', 422, {
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.') || 'value',
        message: issue.message,
      })),
    });
  }

  if (error.message === 'Not allowed by CORS') {
    error = new AppError('Origin not allowed by CORS.', 403, {
      code: 'CORS_DENIED',
    });
  }

  const statusCode = error.statusCode || error.status || 500;
  const isOperational = error instanceof AppError && error.isOperational;

  logError(error, req);

  if (statusCode >= 500) {
    monitoring.captureException(err, {
      requestId: req.requestId,
      route: req.originalUrl,
      statusCode,
      code: error.code,
    });
  }

  if (req.requestId) {
    res.setHeader('X-Request-Id', req.requestId);
  }

  const message =
    env.isProduction && !isOperational
      ? 'Internal server error'
      : error.message || 'Internal server error';

  return sendError(res, {
    status: statusCode,
    message,
    code: error.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    errors: error.errors,
  });
}

module.exports = errorHandler;
