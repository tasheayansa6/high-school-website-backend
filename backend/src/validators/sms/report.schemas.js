const { z } = require('zod');
const { idField, dateField } = require('./common');

const reportOverviewQuerySchema = z.object({
  academicYearId: idField.optional(),
  classOfferingId: idField.optional(),
  from: dateField.optional(),
  to: dateField.optional(),
});

module.exports = { reportOverviewQuerySchema };
