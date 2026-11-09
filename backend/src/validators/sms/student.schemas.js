const { z } = require('zod');
const {
  emailField,
  passwordField,
  dateField,
  nullableText,
  listQueryBase,
  optionalBooleanQuerySchema,
  atLeastOneField,
} = require('./common');

const studentCodeField = z.string().trim().min(1, 'studentCode is required').max(50);

const createStudentBodySchema = z
  .object({
    email: emailField,
    password: passwordField,
    firstName: z.string().trim().min(1, 'firstName is required').max(100),
    lastName: z.string().trim().min(1, 'lastName is required').max(100),
    studentCode: studentCodeField,
    dateOfBirth: dateField.optional().nullable(),
    gender: nullableText(30),
    phone: nullableText(50),
    guardianName: nullableText(150),
    guardianPhone: nullableText(50),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateStudentBodySchema = z
  .object({
    email: emailField.optional(),
    password: passwordField.optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    studentCode: studentCodeField.optional(),
    dateOfBirth: dateField.optional().nullable(),
    gender: nullableText(30),
    phone: nullableText(50),
    guardianName: nullableText(150),
    guardianPhone: nullableText(50),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const studentListQuerySchema = z.object({
  ...listQueryBase,
  isActive: optionalBooleanQuerySchema,
  sortBy: z
    .enum(['createdAt', 'lastName', 'firstName', 'email', 'studentCode'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = {
  createStudentBodySchema,
  updateStudentBodySchema,
  studentListQuerySchema,
};
