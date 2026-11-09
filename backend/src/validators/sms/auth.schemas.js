const { z } = require('zod');

const emailField = z
  .string()
  .trim()
  .email('email must be a valid email address')
  .max(255)
  .transform((value) => value.toLowerCase());

const passwordField = z
  .string()
  .min(1, 'password is required')
  .max(128, 'password must be at most 128 characters');

const teacherLoginBodySchema = z.object({
  email: emailField,
  password: passwordField,
});

/**
 * Students sign in with either email or studentCode (exactly one).
 */
const studentLoginBodySchema = z
  .object({
    email: emailField.optional(),
    studentCode: z.string().trim().min(1).max(50).optional(),
    password: passwordField,
  })
  .refine((data) => Boolean(data.email) !== Boolean(data.studentCode), {
    message: 'Provide either email or studentCode',
    path: ['email'],
  });

module.exports = {
  teacherLoginBodySchema,
  studentLoginBodySchema,
};
