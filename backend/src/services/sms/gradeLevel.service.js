const { prisma } = require('../../config/database');
const { createCatalogService } = require('./catalog.factory');

module.exports = createCatalogService({
  model: 'gradeLevel',
  entityType: 'GradeLevel',
  auditPrefix: 'grade-levels',
  label: 'Grade level',
  codePrefix: 'GRADE_LEVEL',
  fields: ['name', 'code', 'sortOrder'],
  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  searchFields: ['name', 'code'],
  countDependents: (id) =>
    prisma.classOffering.count({ where: { gradeLevelId: id, deletedAt: null } }),
});
