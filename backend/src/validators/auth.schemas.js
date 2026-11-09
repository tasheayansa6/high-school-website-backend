const { z } = require('zod');

const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email('email must be a valid email address')
    .max(255)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, 'password is required')
    .max(128, 'password must be at most 128 characters'),
});

module.exports = {
  loginBodySchema,
};
