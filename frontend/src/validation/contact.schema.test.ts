import { describe, expect, it } from 'vitest';

import { contactMessageSchema } from '@/validation/contact.schema';

describe('contactMessageSchema', () => {
  const valid = {
    name: 'Dawit Hailu',
    email: 'dawit@example.com',
    phone: '',
    subject: 'Campus visit',
    message: 'We would like to schedule a campus tour.',
  };

  it('accepts valid payload and nulls empty phone', () => {
    const parsed = contactMessageSchema.parse(valid);
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBe('dawit@example.com');
  });

  it('rejects invalid email', () => {
    expect(contactMessageSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(contactMessageSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects subject over 255 characters', () => {
    expect(contactMessageSchema.safeParse({ ...valid, subject: 's'.repeat(256) }).success).toBe(
      false,
    );
  });

  it('rejects message over 5000 characters', () => {
    expect(contactMessageSchema.safeParse({ ...valid, message: 'm'.repeat(5001) }).success).toBe(
      false,
    );
  });
});
