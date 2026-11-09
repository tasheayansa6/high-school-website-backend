import { describe, expect, it } from 'vitest';

import { adminLoginSchema, studentLoginSchema } from '@/validation/auth.schema';

describe('adminLoginSchema', () => {
  it('accepts valid credentials and lowercases email', () => {
    const parsed = adminLoginSchema.parse({
      email: 'Admin@Example.com',
      password: 'SecurePass1',
    });
    expect(parsed.email).toBe('admin@example.com');
  });

  it('rejects invalid email', () => {
    expect(adminLoginSchema.safeParse({ email: 'bad', password: 'SecurePass1' }).success).toBe(
      false,
    );
  });

  it('rejects empty password', () => {
    expect(adminLoginSchema.safeParse({ email: 'admin@example.com', password: '' }).success).toBe(
      false,
    );
  });

  it('rejects password over 128 characters', () => {
    expect(
      adminLoginSchema.safeParse({
        email: 'admin@example.com',
        password: 'x'.repeat(129),
      }).success,
    ).toBe(false);
  });
});

describe('studentLoginSchema', () => {
  it('maps an email identifier to email (lowercased)', () => {
    expect(studentLoginSchema.parse({ identifier: 'Kid@Example.com', password: 'x' })).toEqual({
      email: 'kid@example.com',
      password: 'x',
    });
  });

  it('maps a non-email identifier to studentCode', () => {
    expect(studentLoginSchema.parse({ identifier: ' AA-001 ', password: 'x' })).toEqual({
      studentCode: 'AA-001',
      password: 'x',
    });
  });

  it('rejects malformed email, empty identifier and empty password', () => {
    expect(studentLoginSchema.safeParse({ identifier: 'a@b', password: 'x' }).success).toBe(false);
    expect(studentLoginSchema.safeParse({ identifier: '', password: 'x' }).success).toBe(false);
    expect(studentLoginSchema.safeParse({ identifier: 'AA-001', password: '' }).success).toBe(
      false,
    );
  });
});
