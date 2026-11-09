const { z } = require('zod');
const {
  idField,
  dateField,
  listQueryBase,
  optionalBooleanQuerySchema,
  atLeastOneField,
} = require('./common');

const codeField = (max) => z.string().trim().min(1, 'code is required').max(max);

// --- Academic years --------------------------------------------------------

const createAcademicYearBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(100),
    code: codeField(50),
    startsOn: dateField,
    endsOn: dateField,
    isCurrent: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.endsOn.getTime() >= data.startsOn.getTime(), {
    message: 'endsOn must not be earlier than startsOn',
    path: ['endsOn'],
  });

const updateAcademicYearBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: codeField(50).optional(),
    startsOn: dateField.optional(),
    endsOn: dateField.optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const academicYearListQuerySchema = z.object({
  ...listQueryBase,
  isCurrent: optionalBooleanQuerySchema,
});

// --- Academic terms --------------------------------------------------------

const yearIdParamSchema = z.object({ id: idField });
const termParamsSchema = z.object({ id: idField, termId: idField });

const createAcademicTermBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(100),
    sequence: z.coerce.number().int().min(1).max(20),
    startsOn: dateField,
    endsOn: dateField,
  })
  .strict()
  .refine((data) => data.endsOn.getTime() >= data.startsOn.getTime(), {
    message: 'endsOn must not be earlier than startsOn',
    path: ['endsOn'],
  });

const updateAcademicTermBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sequence: z.coerce.number().int().min(1).max(20).optional(),
    startsOn: dateField.optional(),
    endsOn: dateField.optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

// --- Grade levels / sections / subjects -----------------------------------

const createGradeLevelBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(100),
    code: codeField(20),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .strict();

const updateGradeLevelBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: codeField(20).optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const createSectionBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(100),
    code: codeField(20),
  })
  .strict();

const updateSectionBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: codeField(20).optional(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const createSubjectBodySchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(150),
    code: codeField(50),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const updateSubjectBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    code: codeField(50).optional(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const catalogListQuerySchema = z.object({ ...listQueryBase });

// --- Class offerings -------------------------------------------------------

const createClassOfferingBodySchema = z
  .object({
    academicYearId: idField,
    gradeLevelId: idField,
    sectionId: idField,
    name: z.string().trim().min(1).max(150).optional(),
    homeroomTeacherId: idField.optional().nullable(),
  })
  .strict();

const updateClassOfferingBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    homeroomTeacherId: idField.optional().nullable(),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const classOfferingListQuerySchema = z.object({
  ...listQueryBase,
  academicYearId: idField.optional(),
  gradeLevelId: idField.optional(),
  sectionId: idField.optional(),
  homeroomTeacherId: idField.optional(),
});

// --- Teaching assignments --------------------------------------------------

const createTeachingAssignmentBodySchema = z
  .object({
    teacherId: idField,
    classOfferingId: idField,
    subjectId: idField,
    academicTermId: idField.optional().nullable(),
    isPrimary: z.boolean().optional(),
  })
  .strict();

const teachingAssignmentListQuerySchema = z.object({
  ...listQueryBase,
  teacherId: idField.optional(),
  classOfferingId: idField.optional(),
  subjectId: idField.optional(),
  academicTermId: idField.optional(),
});

module.exports = {
  createAcademicYearBodySchema,
  updateAcademicYearBodySchema,
  academicYearListQuerySchema,
  yearIdParamSchema,
  termParamsSchema,
  createAcademicTermBodySchema,
  updateAcademicTermBodySchema,
  createGradeLevelBodySchema,
  updateGradeLevelBodySchema,
  createSectionBodySchema,
  updateSectionBodySchema,
  createSubjectBodySchema,
  updateSubjectBodySchema,
  catalogListQuerySchema,
  createClassOfferingBodySchema,
  updateClassOfferingBodySchema,
  classOfferingListQuerySchema,
  createTeachingAssignmentBodySchema,
  teachingAssignmentListQuerySchema,
};
