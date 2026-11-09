const { prisma } = require('../../config/database');
const { createCatalogService } = require('./catalog.factory');

module.exports = createCatalogService({
  model: 'section',
  entityType: 'Section',
  auditPrefix: 'sections',
  label: 'Section',
  codePrefix: 'SECTION',
  fields: ['name', 'code'],
  orderBy: [{ name: 'asc' }, { id: 'asc' }],
  searchFields: ['name', 'code'],
  countDependents: (id) =>
    prisma.classOffering.count({ where: { sectionId: id, deletedAt: null } }),
});
