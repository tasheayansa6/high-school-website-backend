const { z } = require('zod');

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === true || value === 'true' || value === '1';
  });

const idField = z.coerce.number().int().positive();

const emailField = z
  .string()
  .trim()
  .email('email must be a valid email address')
  .max(255)
  .transform((value) => value.toLowerCase());

const passwordField = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(128, 'password must be at most 128 characters');

/** Accepts YYYY-MM-DD or a full ISO date-time and yields a Date. */
const dateField = z
  .string()
  .trim()
  .min(1, 'date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid ISO-8601 date',
  })
  .transform((value) => new Date(value));

const nullableText = (max) => z.string().trim().max(max).optional().nullable();

const listQueryBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  includeDeleted: booleanQuerySchema,
};

const includeDeletedQuerySchema = z.object({
  includeDeleted: booleanQuerySchema,
});

const idParamSchema = z.object({ id: idField });

function atLeastOneField(data) {
  return Object.keys(data).length > 0;
}

module.exports = {
  booleanQuerySchema,
  optionalBooleanQuerySchema,
  idField,
  emailField,
  passwordField,
  dateField,
  nullableText,
  listQueryBase,
  includeDeletedQuerySchema,
  idParamSchema,
  atLeastOneField,
};
