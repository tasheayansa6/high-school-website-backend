import { describe, expect, it } from 'vitest';

import { newsletterSubscribeSchema } from '@/validation/newsletter.schema';

describe('newsletterSubscribeSchema', () => {
  it('accepts a valid email and lowercases it', () => {
    const parsed = newsletterSubscribeSchema.parse({ email: 'Parent@Example.COM' });
    expect(parsed.email).toBe('parent@example.com');
  });

  it('rejects invalid email', () => {
    expect(newsletterSubscribeSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('rejects empty email', () => {
    expect(newsletterSubscribeSchema.safeParse({ email: '   ' }).success).toBe(false);
  });
});
