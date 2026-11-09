const { prisma } = require('../../config/database');
const { createCatalogService } = require('./catalog.factory');

module.exports = createCatalogService({
  model: 'subject',
  entityType: 'Subject',
  auditPrefix: 'subjects',
  label: 'Subject',
  codePrefix: 'SUBJECT',
  fields: ['name', 'code', 'description'],
  orderBy: [{ name: 'asc' }, { id: 'asc' }],
  searchFields: ['name', 'code'],
  countDependents: (id) =>
    prisma.teachingAssignment.count({ where: { subjectId: id, deletedAt: null } }),
});
