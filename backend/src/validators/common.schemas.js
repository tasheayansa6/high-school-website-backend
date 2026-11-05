const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Architecture smoke-test schema (not a business module).
 * Used by POST /api/v1/system/validate-example.
 */
const validateExampleBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
});

module.exports = {
  idParamSchema,
  paginationQuerySchema,
  validateExampleBodySchema,
};
