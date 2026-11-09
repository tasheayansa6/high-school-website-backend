const { z } = require('zod');
const { idField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const audienceSchema = z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'CLASS']);

const announcementListQuerySchema = z.object({
  ...listQueryBase,
  audience: audienceSchema.optional(),
  classOfferingId: idField.optional(),
  isPublished: optionalBooleanQuerySchema,
});

const createAnnouncementBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(50000),
    audience: audienceSchema.optional(),
    classOfferingId: idField.optional().nullable(),
    isPublished: z.boolean().optional(),
  })
  .strict();

const updateAnnouncementBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).max(50000).optional(),
    audience: audienceSchema.optional(),
    classOfferingId: idField.optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const studentAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  announcementListQuerySchema,
  createAnnouncementBodySchema,
  updateAnnouncementBodySchema,
  studentAnnouncementsQuerySchema,
};
