const { z } = require('zod');
const { idField, listQueryBase, optionalBooleanQuerySchema } = require('./common');

const categorySchema = z.enum([
  'ACADEMIC',
  'ATTENDANCE',
  'TIMETABLE',
  'LEARNING_MATERIAL',
  'ANNOUNCEMENT',
  'ADMINISTRATION',
  'MESSAGING',
]);

const optionalDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional();

const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: categorySchema.optional(),
  isRead: optionalBooleanQuerySchema,
  includeArchived: listQueryBase.includeDeleted.optional(),
  from: optionalDateSchema,
  to: optionalDateSchema,
});

module.exports = {
  categorySchema,
  notificationListQuerySchema,
  idParamSchema: z.object({ id: idField }),
};
