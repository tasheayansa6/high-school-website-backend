const { z } = require('zod');

const contactStatusSchema = z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const createContactBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(150, 'name must be at most 150 characters'),
  email: z
    .string()
    .trim()
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(50, 'phone must be at most 50 characters')
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(1, 'subject is required')
    .max(255, 'subject must be at most 255 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'message is required')
    .max(5000, 'message must be at most 5000 characters'),
});

const adminContactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: contactStatusSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: booleanQuerySchema,
});

const contactIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const updateContactStatusBodySchema = z.object({
  status: contactStatusSchema,
});

module.exports = {
  createContactBodySchema,
  adminContactListQuerySchema,
  contactIdParamSchema,
  updateContactStatusBodySchema,
};
