const { z } = require('zod');

const newsletterStatusSchema = z.enum(['PENDING', 'ACTIVE', 'UNSUBSCRIBED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const subscribeBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'email is required')
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
});

const confirmQuerySchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'token is required')
    .max(256, 'token is too long'),
});

const unsubscribeBodySchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'token is required')
    .max(256, 'token is too long'),
});

const adminSubscriberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: newsletterStatusSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: booleanQuerySchema,
});

const subscriberIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const updateSubscriberStatusBodySchema = z.object({
  status: newsletterStatusSchema,
});

module.exports = {
  subscribeBodySchema,
  confirmQuerySchema,
  unsubscribeBodySchema,
  adminSubscriberListQuerySchema,
  subscriberIdParamSchema,
  updateSubscriberStatusBodySchema,
};
