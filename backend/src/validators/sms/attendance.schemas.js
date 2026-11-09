const { z } = require('zod');
const { idField, dateField, listQueryBase } = require('./common');

const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
const notesField = z.string().trim().max(500).optional().nullable();

const attendanceListQuerySchema = z.object({
  ...listQueryBase,
  studentId: idField.optional(),
  classOfferingId: idField.optional(),
  status: attendanceStatusSchema.optional(),
  date: dateField.optional(),
  from: dateField.optional(),
  to: dateField.optional(),
});

const upsertAttendanceBodySchema = z
  .object({
    studentId: idField,
    classOfferingId: idField,
    attendanceDate: dateField,
    status: attendanceStatusSchema,
    notes: notesField,
  })
  .strict();

const bulkAttendanceBodySchema = z
  .object({
    classOfferingId: idField,
    attendanceDate: dateField,
    records: z
      .array(
        z
          .object({
            studentId: idField,
            status: attendanceStatusSchema,
            notes: notesField,
          })
          .strict()
      )
      .min(1)
      .max(500),
  })
  .strict();

/** Student portal: own attendance. */
const studentAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classOfferingId: idField.optional(),
  status: attendanceStatusSchema.optional(),
  from: dateField.optional(),
  to: dateField.optional(),
});

module.exports = {
  attendanceStatusSchema,
  attendanceListQuerySchema,
  upsertAttendanceBodySchema,
  bulkAttendanceBodySchema,
  studentAttendanceQuerySchema,
};
