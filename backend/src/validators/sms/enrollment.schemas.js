const { z } = require('zod');
const { idField, dateField, listQueryBase } = require('./common');

const enrollmentStatusSchema = z.enum(['ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED']);

const createEnrollmentBodySchema = z
  .object({
    studentId: idField,
    classOfferingId: idField,
    academicYearId: idField,
    status: enrollmentStatusSchema.optional(),
    enrolledAt: dateField.optional(),
  })
  .strict();

const updateEnrollmentStatusBodySchema = z
  .object({
    status: enrollmentStatusSchema,
    leftAt: dateField.optional().nullable(),
  })
  .strict();

const enrollmentListQuerySchema = z.object({
  ...listQueryBase,
  studentId: idField.optional(),
  classOfferingId: idField.optional(),
  academicYearId: idField.optional(),
  status: enrollmentStatusSchema.optional(),
});

module.exports = {
  createEnrollmentBodySchema,
  updateEnrollmentStatusBodySchema,
  enrollmentListQuerySchema,
};
