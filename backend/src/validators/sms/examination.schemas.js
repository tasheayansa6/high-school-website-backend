const { z } = require('zod');
const { idField, dateField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const maxScoreField = z.number().positive().max(999999.99);
const weightField = z.number().min(0).max(999999.99);

const examinationListQuerySchema = z.object({
  ...listQueryBase,
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
  examType: z.string().trim().max(50).optional(),
  isPublished: optionalBooleanQuerySchema,
  marksStatus: z.enum(['DRAFT', 'SUBMITTED']).optional(),
  categoryId: idField.optional(),
});

const createExaminationBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    examType: z.string().trim().min(1).max(50).optional(),
    classOfferingId: idField,
    subjectId: idField,
    academicYearId: idField,
    academicTermId: idField.optional().nullable(),
    examDate: dateField.optional().nullable(),
    maxScore: maxScoreField.optional(),
    categoryId: idField.optional().nullable(),
    weight: weightField.optional(),
  })
  .strict();

const updateExaminationBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    examType: z.string().trim().min(1).max(50).optional(),
    academicTermId: idField.optional().nullable(),
    examDate: dateField.optional().nullable(),
    maxScore: maxScoreField.optional(),
    categoryId: idField.optional().nullable(),
    weight: weightField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const examResultListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includeDeleted: listQueryBase.includeDeleted,
});

const upsertExamResultsBodySchema = z
  .object({
    results: z
      .array(
        z
          .object({
            studentId: idField,
            score: z.number().min(0).max(999999.99),
            gradeLetter: z.string().trim().max(5).optional().nullable(),
            remarks: z.string().trim().max(500).optional().nullable(),
          })
          .strict()
      )
      .min(1)
      .max(500),
  })
  .strict();

const examResultParamsSchema = z.object({
  id: idField,
  resultId: idField,
});

/** Student portal published results. */
const studentExamResultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  academicYearId: idField.optional(),
  subjectId: idField.optional(),
  academicTermId: idField.optional(),
});

module.exports = {
  examinationListQuerySchema,
  createExaminationBodySchema,
  updateExaminationBodySchema,
  examResultListQuerySchema,
  upsertExamResultsBodySchema,
  examResultParamsSchema,
  studentExamResultsQuerySchema,
};
