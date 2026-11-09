const { z } = require('zod');
const { idField, listQueryBase, optionalBooleanQuerySchema } = require('./common');
const { CATEGORIES } = require('../../utils/learningMaterialFileTypes');

const categorySchema = z.enum(Object.values(CATEGORIES));

const listQuerySchema = z.object({
  ...listQueryBase,
  q: z.string().trim().max(200).optional(),
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
  teacherId: idField.optional(),
  category: categorySchema.optional(),
  isPublished: optionalBooleanQuerySchema,
  includeArchived: optionalBooleanQuerySchema,
});

const optionalTermId = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  idField.nullable().optional()
);

const createBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.string().trim().max(2000).nullable().optional()
    ),
    category: categorySchema.optional(),
    academicYearId: idField,
    academicTermId: optionalTermId,
    classOfferingId: idField,
    subjectId: idField,
    publish: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .optional()
      .transform((value) => {
        if (value === undefined) return false;
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === '1';
      }),
  })
  .strict();

const updateBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    category: categorySchema.optional(),
    academicTermId: optionalTermId,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

module.exports = {
  listQuerySchema,
  createBodySchema,
  updateBodySchema,
  categorySchema,
};
