import { z } from 'zod';

import { optionalContactPhoneSchema } from '@/validation/phone';

/** Client schema aligned with backend `createContactBodySchema`. */
export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(150, 'name must be at most 150 characters'),
  email: z
    .string()
    .trim()
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
  phone: optionalContactPhoneSchema,
  subject: z
    .string()
    .trim()
    .min(1, 'subject is required')
    .max(255, 'subject must be at most 255 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'message is required')
    .max(5000, 'message must be at most 5000 characters'),
});

export type ContactMessageFormValues = z.input<typeof contactMessageSchema>;
export type ContactMessageParsed = z.output<typeof contactMessageSchema>;
