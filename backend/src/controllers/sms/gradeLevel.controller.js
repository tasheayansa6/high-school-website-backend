const gradeLevelService = require('../../services/sms/gradeLevel.service');
const { createCatalogController } = require('./catalog.controller.factory');

module.exports = createCatalogController(gradeLevelService, 'Grade level', 'gradeLevel');
