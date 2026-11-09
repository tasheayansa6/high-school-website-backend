const { z } = require('zod');

const publicationStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const createPageBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title is required')
    .max(255, 'title must be at most 255 characters'),
  slug: z
    .string()
    .trim()
    .max(255, 'slug must be at most 255 characters')
    .optional(),
  content: z.string().min(1, 'content is required'),
});

const updatePageBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'title cannot be empty')
      .max(255, 'title must be at most 255 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .min(1, 'slug cannot be empty')
      .max(255, 'slug must be at most 255 characters')
      .optional(),
    content: z.string().min(1, 'content cannot be empty').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const publicPageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminPageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: publicationStatusSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'title', 'publishedAt'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: booleanQuerySchema,
});

const adminPageSearchQuerySchema = adminPageListQuerySchema.extend({
  q: z
    .string()
    .trim()
    .min(1, 'q is required')
    .max(100, 'q must be at most 100 characters'),
});

const pageIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const pageSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'slug is required')
    .max(255, 'slug must be at most 255 characters'),
});

const adminPageGetQuerySchema = z.object({
  includeDeleted: booleanQuerySchema,
});

module.exports = {
  createPageBodySchema,
  updatePageBodySchema,
  publicPageListQuerySchema,
  adminPageListQuerySchema,
  adminPageSearchQuerySchema,
  pageIdParamSchema,
  pageSlugParamSchema,
  adminPageGetQuerySchema,
};
