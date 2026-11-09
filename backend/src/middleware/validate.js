const AppError = require('../utils/AppError');

/**
 * Reusable Zod validation middleware.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return function validationMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : source,
        message: issue.message,
      }));

      return next(
        new AppError('Validation failed.', 422, {
          code: 'VALIDATION_ERROR',
          errors,
        })
      );
    }

    // Keep validated/sanitized values separate from raw Express objects.
    req.validated = req.validated || {};
    req.validated[source] = result.data;

    return next();
  };
}

module.exports = validate;
