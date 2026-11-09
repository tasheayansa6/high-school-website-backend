const { z } = require('zod');
const { idField, dateField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

/** Money with at most 2 decimal places. */
const moneyField = z
  .number()
  .max(9999999999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'must have at most 2 decimal places',
  });

const positiveMoneyField = moneyField.refine((value) => value > 0, {
  message: 'must be greater than 0',
});

const feePaymentStatusSchema = z.enum(['UNPAID', 'PARTIAL', 'PAID', 'WAIVED']);

const feeStructureListQuerySchema = z.object({
  ...listQueryBase,
  isActive: optionalBooleanQuerySchema,
});

const createFeeStructureBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).optional().nullable(),
    amount: positiveMoneyField,
    currency: z.string().trim().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateFeeStructureBodySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    amount: positiveMoneyField.optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const studentFeeListQuerySchema = z.object({
  ...listQueryBase,
  studentId: idField.optional(),
  feeStructureId: idField.optional(),
  academicYearId: idField.optional(),
  academicTermId: idField.optional(),
  status: feePaymentStatusSchema.optional(),
});

const assignStudentFeeBodySchema = z
  .object({
    studentId: idField,
    feeStructureId: idField,
    academicYearId: idField,
    academicTermId: idField.optional().nullable(),
    amountDue: positiveMoneyField.optional(),
    dueDate: dateField.optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const updateStudentFeeBodySchema = z
  .object({
    amountDue: positiveMoneyField.optional(),
    dueDate: dateField.optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    waived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const recordPaymentBodySchema = z
  .object({
    amount: positiveMoneyField,
    paymentMethod: z.string().trim().max(50).optional().nullable(),
    reference: z.string().trim().max(100).optional().nullable(),
    paidAt: dateField.optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const feePaymentParamsSchema = z.object({
  id: idField,
  paymentId: idField,
});

/** Student portal own fees. */
const studentOwnFeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  academicYearId: idField.optional(),
  status: feePaymentStatusSchema.optional(),
});

module.exports = {
  feeStructureListQuerySchema,
  createFeeStructureBodySchema,
  updateFeeStructureBodySchema,
  studentFeeListQuerySchema,
  assignStudentFeeBodySchema,
  updateStudentFeeBodySchema,
  recordPaymentBodySchema,
  feePaymentParamsSchema,
  studentOwnFeesQuerySchema,
};
