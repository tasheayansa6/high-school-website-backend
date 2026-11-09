import { z } from 'zod';

/** Matches backend `loginBodySchema`. */
export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'email is required')
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, 'password is required')
    .max(128, 'password must be at most 128 characters'),
});

export type AdminLoginFormValues = z.input<typeof adminLoginSchema>;
export type AdminLoginParsed = z.output<typeof adminLoginSchema>;

/** Matches backend `teacherLoginBodySchema`. */
export const teacherLoginSchema = adminLoginSchema;

export type TeacherLoginFormValues = z.input<typeof teacherLoginSchema>;

/**
 * Student sign-in form. One identifier field accepts email OR student code; the parsed
 * output mirrors backend `studentLoginBodySchema` (exactly one of `email` / `studentCode`).
 */
const studentEmailSchema = z.string().email('email must be a valid email address').max(255);

export const studentLoginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, 'email or student code is required')
      .max(255, 'email or student code is too long'),
    password: z
      .string()
      .min(1, 'password is required')
      .max(128, 'password must be at most 128 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.identifier.includes('@')) {
      if (!studentEmailSchema.safeParse(data.identifier).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['identifier'],
          message: 'email must be a valid email address',
        });
      }
    } else if (data.identifier.length > 50) {
      ctx.addIssue({
        code: 'custom',
        path: ['identifier'],
        message: 'student code must be at most 50 characters',
      });
    }
  })
  .transform((data) =>
    data.identifier.includes('@')
      ? { email: data.identifier.toLowerCase(), password: data.password }
      : { studentCode: data.identifier, password: data.password },
  );

export type StudentLoginFormValues = z.input<typeof studentLoginSchema>;
export type StudentLoginParsed = z.output<typeof studentLoginSchema>;
