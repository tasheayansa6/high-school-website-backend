import { z } from 'zod';

/** Client schema aligned with backend `subscribeBodySchema`. */
export const newsletterSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'email is required')
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
});

export type NewsletterSubscribeFormValues = z.input<typeof newsletterSubscribeSchema>;
export type NewsletterSubscribeParsed = z.output<typeof newsletterSubscribeSchema>;
