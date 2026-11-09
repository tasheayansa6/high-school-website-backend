const { z } = require('zod');

const isoDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid ISO-8601 date-time',
  });

const dateRangeQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to) {
      const fromTime = Date.parse(data.from);
      const toTime = Date.parse(data.to);
      if (fromTime > toTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['from'],
          message: 'from must not be later than to',
        });
      }
    }
  });

const recentActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const inquiryStatisticsQuerySchema = dateRangeQuerySchema;

module.exports = {
  dateRangeQuerySchema,
  recentActivityQuerySchema,
  inquiryStatisticsQuerySchema,
};
