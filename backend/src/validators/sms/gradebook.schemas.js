const { z } = require('zod');
const { idField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const weightModeSchema = z.enum(['RELATIVE', 'PERCENT']);

const gradeBoundarySchema = z
  .object({
    letter: z.string().trim().min(1).max(5),
    minPercent: z.number().min(0).max(100),
    maxPercent: z.number().min(0).max(100),
    remark: z.string().trim().max(255).optional().nullable(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const createGradingScaleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    weightMode: weightModeSchema.optional(),
    treatMissingAsZero: z.boolean().optional(),
    decimalPlaces: z.number().int().min(0).max(6).optional(),
    boundaries: z.array(gradeBoundarySchema).min(1).max(50).optional(),
  })
  .strict();

const updateGradingScaleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    weightMode: weightModeSchema.optional(),
    treatMissingAsZero: z.boolean().optional(),
    decimalPlaces: z.number().int().min(0).max(6).optional(),
    boundaries: z.array(gradeBoundarySchema).min(1).max(50).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const createAssessmentCategoryBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9_]+$/, 'code must be alphanumeric/underscore'),
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    defaultWeight: z.number().min(0).max(999999.99).optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateAssessmentCategoryBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9_]+$/)
      .optional(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    defaultWeight: z.number().min(0).max(999999.99).optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const validateWeightsBodySchema = z
  .object({
    weights: z.array(z.number()).min(1).max(200),
    weightMode: weightModeSchema.optional(),
    gradingScaleId: idField.optional(),
  })
  .strict();

const gradebookOverviewQuerySchema = z.object({
  ...listQueryBase,
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
  gradeLevelId: idField.optional(),
  marksStatus: z.enum(['DRAFT', 'SUBMITTED']).optional(),
});

const classSubjectGradebookQuerySchema = z.object({
  classOfferingId: idField,
  subjectId: idField,
  academicYearId: idField.optional(),
  academicTermId: idField.optional().nullable(),
  publishedOnly: optionalBooleanQuerySchema,
});

const pendingSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
});

const teacherGradebookListQuerySchema = z.object({
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
});

const studentGradebookSummaryQuerySchema = z.object({
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
});

const reopenMarksBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .optional()
  .default({});

const categoriesListQuerySchema = z.object({
  includeDeleted: listQueryBase.includeDeleted,
  isActive: optionalBooleanQuerySchema,
});

module.exports = {
  createGradingScaleBodySchema,
  updateGradingScaleBodySchema,
  createAssessmentCategoryBodySchema,
  updateAssessmentCategoryBodySchema,
  validateWeightsBodySchema,
  gradebookOverviewQuerySchema,
  classSubjectGradebookQuerySchema,
  pendingSubmissionsQuerySchema,
  teacherGradebookListQuerySchema,
  studentGradebookSummaryQuerySchema,
  reopenMarksBodySchema,
  categoriesListQuerySchema,
};
