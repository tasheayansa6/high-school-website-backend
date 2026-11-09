import { describe, expect, it } from 'vitest';

import { admissionInquirySchema, DEFAULT_ACADEMIC_YEAR } from '@/validation/admissions.schema';

describe('admissionInquirySchema', () => {
  const valid = {
    studentName: 'Amina Bekele',
    guardianName: 'Sara Bekele',
    email: 'Family@Example.com',
    phone: '+251 911 234 567',
    gradeApplyingFor: 'Grade 9',
    academicYear: DEFAULT_ACADEMIC_YEAR,
    message: 'We would like curriculum details for Grade 9.',
    subscribeNewsletter: true,
  };

  it('accepts a valid inquiry and lowercases email', () => {
    const parsed = admissionInquirySchema.parse(valid);
    expect(parsed.email).toBe('family@example.com');
    expect(parsed.guardianName).toBe('Sara Bekele');
    expect(parsed.academicYear).toBe(DEFAULT_ACADEMIC_YEAR);
  });

  it('rejects empty studentName', () => {
    const result = admissionInquirySchema.safeParse({ ...valid, studentName: '  ' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = admissionInquirySchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects phone with too few digits', () => {
    const result = admissionInquirySchema.safeParse({ ...valid, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects phone with invalid characters', () => {
    const result = admissionInquirySchema.safeParse({ ...valid, phone: '911-abc-4567' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 5000 characters', () => {
    const result = admissionInquirySchema.safeParse({
      ...valid,
      message: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('turns empty guardianName into null', () => {
    const parsed = admissionInquirySchema.parse({ ...valid, guardianName: '' });
    expect(parsed.guardianName).toBeNull();
  });
});
