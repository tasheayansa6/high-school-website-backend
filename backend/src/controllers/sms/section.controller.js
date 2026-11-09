const sectionService = require('../../services/sms/section.service');
const { createCatalogController } = require('./catalog.controller.factory');

module.exports = createCatalogController(sectionService, 'Section', 'section');
