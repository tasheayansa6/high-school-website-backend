const { z } = require('zod');
const { idField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const weekdaySchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm (24h)');

const classroomListQuerySchema = z.object({
  ...listQueryBase,
});

const createClassroomBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(50),
    capacity: z.number().int().positive().nullable().optional(),
  })
  .strict();

const updateClassroomBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1).max(50).optional(),
    capacity: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const timetableListQuerySchema = z.object({
  ...listQueryBase,
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
  classOfferingId: idField.optional(),
  teacherId: idField.optional(),
  subjectId: idField.optional(),
  dayOfWeek: weekdaySchema.optional(),
  isPublished: optionalBooleanQuerySchema,
});

const createTimetableBodySchema = z
  .object({
    academicYearId: idField,
    academicTermId: idField.optional().nullable(),
    classOfferingId: idField,
    title: z.string().trim().min(1).max(255).optional().nullable(),
  })
  .strict();

const updateTimetableBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const createEntryBodySchema = z
  .object({
    dayOfWeek: weekdaySchema,
    startTime: timeSchema,
    endTime: timeSchema,
    subjectId: idField,
    teacherId: idField,
    classroomId: idField.optional().nullable(),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const updateEntryBodySchema = z
  .object({
    dayOfWeek: weekdaySchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    subjectId: idField.optional(),
    teacherId: idField.optional(),
    classroomId: idField.optional().nullable(),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const conflictCheckQuerySchema = z.object({
  timetableId: idField,
  dayOfWeek: weekdaySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  teacherId: idField,
  classroomId: idField.optional(),
  excludeEntryId: idField.optional(),
});

const teacherTimetableQuerySchema = z.object({
  dayOfWeek: weekdaySchema.optional(),
});

module.exports = {
  weekdaySchema,
  classroomListQuerySchema,
  createClassroomBodySchema,
  updateClassroomBodySchema,
  timetableListQuerySchema,
  createTimetableBodySchema,
  updateTimetableBodySchema,
  createEntryBodySchema,
  updateEntryBodySchema,
  conflictCheckQuerySchema,
  teacherTimetableQuerySchema,
};
