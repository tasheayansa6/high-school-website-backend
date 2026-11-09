const { z } = require('zod');
const { idField, dateField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const maxScoreField = z.number().positive().max(999999.99);

const assignmentListQuerySchema = z.object({
  ...listQueryBase,
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
  teacherId: idField.optional(),
  isPublished: optionalBooleanQuerySchema,
});

const createAssignmentBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(20000).optional().nullable(),
    classOfferingId: idField,
    subjectId: idField,
    teacherId: idField,
    dueAt: dateField.optional().nullable(),
    maxScore: maxScoreField.optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

/** Teacher portal: teacherId always comes from the token. */
const teacherCreateAssignmentBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(20000).optional().nullable(),
    classOfferingId: idField,
    subjectId: idField,
    dueAt: dateField.optional().nullable(),
    maxScore: maxScoreField.optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

const updateAssignmentBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(20000).optional().nullable(),
    dueAt: dateField.optional().nullable(),
    maxScore: maxScoreField.optional(),
    isPublished: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SUBMITTED', 'GRADED', 'RETURNED', 'LATE']).optional(),
});

const gradeSubmissionBodySchema = z
  .object({
    score: z.number().min(0).max(999999.99),
    feedback: z.string().trim().max(20000).optional().nullable(),
    status: z.enum(['GRADED', 'RETURNED']).optional(),
  })
  .strict();

const submitAssignmentBodySchema = z
  .object({
    content: z.string().trim().min(1).max(20000),
  })
  .strict();

const assignmentSubmissionParamsSchema = z.object({
  id: idField,
  submissionId: idField,
});

/** Student portal assignment list. */
const studentAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
});

module.exports = {
  assignmentListQuerySchema,
  createAssignmentBodySchema,
  teacherCreateAssignmentBodySchema,
  updateAssignmentBodySchema,
  submissionListQuerySchema,
  gradeSubmissionBodySchema,
  submitAssignmentBodySchema,
  assignmentSubmissionParamsSchema,
  studentAssignmentsQuerySchema,
};
