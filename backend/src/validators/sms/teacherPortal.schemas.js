const { z } = require('zod');
const { idField } = require('./common');

const teacherStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  classOfferingId: idField.optional(),
});

module.exports = { teacherStudentsQuerySchema };
