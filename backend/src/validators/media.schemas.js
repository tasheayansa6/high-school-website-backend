const { z } = require('zod');
const { ALLOWED_MIME_TYPES } = require('../utils/fileSignature');

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const booleanBodySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === true || value === 'true' || value === '1';
  });

const uploadMediaFieldsSchema = z
  .object({
    altText: z.string().trim().max(255).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    isGalleryImage: booleanBodySchema,
    sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict();

const updateMediaBodySchema = z
  .object({
    altText: z.string().trim().max(255).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    isGalleryImage: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const adminMediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  mimeType: z.enum(ALLOWED_MIME_TYPES).optional(),
  isGalleryImage: booleanQuerySchema,
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: booleanQuerySchema,
});

const mediaIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

/** Public content URLs use a 32-char hex publicId (not the numeric PK). */
const mediaPublicIdParamSchema = z.object({
  publicId: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{32}$/, {
      message: 'publicId must be a 32-character hex identifier',
    }),
});

const adminMediaGetQuerySchema = z.object({
  includeDeleted: booleanQuerySchema,
});

module.exports = {
  uploadMediaFieldsSchema,
  updateMediaBodySchema,
  adminMediaListQuerySchema,
  mediaIdParamSchema,
  mediaPublicIdParamSchema,
  adminMediaGetQuerySchema,
};
