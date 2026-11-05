const { z } = require('zod');

const postStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const createPostBodySchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(255),
  slug: z.string().trim().max(255).optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().min(1, 'content is required'),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  featuredImageId: z.coerce.number().int().positive().optional().nullable(),
  authorId: z.coerce.number().int().positive().optional(),
});

const updatePostBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().min(1).max(255).optional(),
    excerpt: z.string().trim().max(500).optional().nullable(),
    content: z.string().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional().nullable(),
    featuredImageId: z.coerce.number().int().positive().optional().nullable(),
    authorId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const publicPostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  categorySlug: z.string().trim().max(150).optional(),
});

const adminPostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: postStatusSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  authorId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: booleanQuerySchema,
  publishedFrom: z.string().trim().optional(),
  publishedTo: z.string().trim().optional(),
});

const postIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const postSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(255),
});

const categorySlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(150),
});

const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

const updateCategoryBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    slug: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const adminCategoryListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  includeDeleted: booleanQuerySchema,
});

const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const adminPostGetQuerySchema = z.object({
  includeDeleted: booleanQuerySchema,
});

module.exports = {
  createPostBodySchema,
  updatePostBodySchema,
  publicPostListQuerySchema,
  adminPostListQuerySchema,
  postIdParamSchema,
  postSlugParamSchema,
  categorySlugParamSchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
  adminCategoryListQuerySchema,
  categoryIdParamSchema,
  adminPostGetQuerySchema,
};
