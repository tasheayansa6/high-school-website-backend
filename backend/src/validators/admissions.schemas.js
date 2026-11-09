const { z } = require('zod');

const admissionStatusSchema = z.enum(['NEW', 'CONTACTED', 'UNDER_REVIEW', 'CLOSED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

/**
 * International-friendly phone check:
 * - Allows digits, spaces, +, -, parentheses, and dots
 * - Requires 7–15 digits after stripping non-digits (E.164 upper bound)
 * - Does not assume a single country format
 */
const phoneSchema = z
  .string()
  .trim()
  .min(1, 'phone is required')
  .max(50, 'phone must be at most 50 characters')
  .regex(/^[+]?[\d\s().-]+$/, 'phone format is invalid')
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, 'phone must contain between 7 and 15 digits');

const createAdmissionInquiryBodySchema = z
  .object({
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
    phone: phoneSchema,
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
  })
  .strict();

const adminAdmissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: admissionStatusSchema.optional(),
  gradeApplyingFor: z.string().trim().max(50).optional(),
  academicYear: z.string().trim().max(20).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: booleanQuerySchema,
});

const admissionIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const updateAdmissionStatusBodySchema = z
  .object({
    status: admissionStatusSchema,
  })
  .strict();

module.exports = {
  createAdmissionInquiryBodySchema,
  adminAdmissionListQuerySchema,
  admissionIdParamSchema,
  updateAdmissionStatusBodySchema,
  phoneSchema,
};
