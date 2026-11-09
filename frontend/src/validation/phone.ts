import { z } from 'zod';

/**
 * Matches backend `phoneSchema` in `admissions.schemas.js`:
 * digits, spaces, +, -, parentheses, dots; 7–15 digits after stripping.
 */
export const admissionPhoneSchema = z
  .string()
  .trim()
  .min(1, 'phone is required')
  .max(50, 'phone must be at most 50 characters')
  .regex(/^[+]?[\d\s().-]+$/, 'phone format is invalid')
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, 'phone must contain between 7 and 15 digits');

/** Optional contact phone — empty becomes null (backend allows null/omit). */
export const optionalContactPhoneSchema = z
  .string()
  .trim()
  .max(50, 'phone must be at most 50 characters')
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));
