const subjectService = require('../../services/sms/subject.service');
const { createCatalogController } = require('./catalog.controller.factory');

module.exports = createCatalogController(subjectService, 'Subject', 'subject');
