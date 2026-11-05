const { z } = require('zod');

const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED']);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, 'date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid ISO-8601 date-time',
  });

const optionalIsoDateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid ISO-8601 date-time',
  })
  .optional()
  .nullable();

function assertEndNotBeforeStart(data, ctx) {
  if (!data.startsAt || data.endsAt == null || data.endsAt === '') {
    return;
  }

  const start = new Date(data.startsAt);
  const end = new Date(data.endsAt);

  if (end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'endsAt must not be earlier than startsAt',
    });
  }
}

const createEventBodySchema = z
  .object({
    title: z.string().trim().min(1, 'title is required').max(255),
    slug: z.string().trim().max(255).optional(),
    description: z.string().trim().min(1, 'description is required').max(20000),
    location: z.string().trim().max(255).optional().nullable(),
    startsAt: isoDateTimeSchema,
    endsAt: optionalIsoDateTimeSchema,
    featuredImageId: z.coerce.number().int().positive().optional().nullable(),
  })
  .strict()
  .superRefine(assertEndNotBeforeStart);

const updateEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(20000).optional(),
    location: z.string().trim().max(255).optional().nullable(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: optionalIsoDateTimeSchema,
    featuredImageId: z.coerce.number().int().positive().optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine(assertEndNotBeforeStart);

const publicEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  timeframe: z.enum(['upcoming', 'past']).optional(),
  startsFrom: z.string().trim().optional(),
  startsTo: z.string().trim().optional(),
});

const adminEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: eventStatusSchema.optional(),
  timeframe: z.enum(['upcoming', 'past']).optional(),
  startsFrom: z.string().trim().optional(),
  startsTo: z.string().trim().optional(),
  sortBy: z.enum(['startsAt', 'createdAt', 'updatedAt', 'publishedAt', 'title']).default('startsAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeDeleted: booleanQuerySchema,
});

const eventIdParamSchema = z.object({
  id: z.coerce.number().int().positive({
    message: 'id must be a positive integer',
  }),
});

const eventSlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(255),
});

const adminEventGetQuerySchema = z.object({
  includeDeleted: booleanQuerySchema,
});

module.exports = {
  createEventBodySchema,
  updateEventBodySchema,
  publicEventListQuerySchema,
  adminEventListQuerySchema,
  eventIdParamSchema,
  eventSlugParamSchema,
  adminEventGetQuerySchema,
};
