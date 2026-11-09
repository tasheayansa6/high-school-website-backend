import { z } from 'zod';

import { admissionPhoneSchema } from '@/validation/phone';

export const DEFAULT_ACADEMIC_YEAR = '2026/2027';

/** Client schema aligned with backend `createAdmissionInquiryBodySchema`. */
export const admissionInquirySchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(1, 'studentName is required')
    .max(150, 'studentName must be at most 150 characters'),
  guardianName: z
    .string()
    .trim()
    .max(150, 'guardianName must be at most 150 characters')
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  email: z
    .string()
    .trim()
    .min(1, 'email is required')
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
  phone: admissionPhoneSchema,
  gradeApplyingFor: z
    .string()
    .trim()
    .min(1, 'gradeApplyingFor is required')
    .max(50, 'gradeApplyingFor must be at most 50 characters'),
  academicYear: z
    .string()
    .trim()
    .min(1, 'academicYear is required')
    .max(20, 'academicYear must be at most 20 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'message is required')
    .max(5000, 'message must be at most 5000 characters'),
  /** UI-only — not sent to the admissions API. */
  subscribeNewsletter: z.boolean().default(false),
});

export type AdmissionInquiryFormValues = z.input<typeof admissionInquirySchema>;
export type AdmissionInquiryParsed = z.output<typeof admissionInquirySchema>;
