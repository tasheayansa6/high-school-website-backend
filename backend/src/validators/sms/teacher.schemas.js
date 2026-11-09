const { z } = require('zod');
const {
  emailField,
  passwordField,
  nullableText,
  listQueryBase,
  optionalBooleanQuerySchema,
  atLeastOneField,
} = require('./common');

const createTeacherBodySchema = z
  .object({
    email: emailField,
    password: passwordField,
    firstName: z.string().trim().min(1, 'firstName is required').max(100),
    lastName: z.string().trim().min(1, 'lastName is required').max(100),
    employeeCode: z.string().trim().min(1).max(50).optional().nullable(),
    phone: nullableText(50),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateTeacherBodySchema = z
  .object({
    email: emailField.optional(),
    password: passwordField.optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    employeeCode: z.string().trim().min(1).max(50).optional().nullable(),
    phone: nullableText(50),
  })
  .strict()
  .refine(atLeastOneField, { message: 'At least one field must be provided' });

const teacherListQuerySchema = z.object({
  ...listQueryBase,
  isActive: optionalBooleanQuerySchema,
  sortBy: z.enum(['createdAt', 'lastName', 'firstName', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = {
  createTeacherBodySchema,
  updateTeacherBodySchema,
  teacherListQuerySchema,
};
