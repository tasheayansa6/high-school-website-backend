const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { reportOverviewQuerySchema } = require('../../../validators/sms/report.schemas');
const controller = require('../../../controllers/sms/report.controller');

const canRead = [authenticate, authorize(PERMISSIONS.REPORTS_READ)];

const router = express.Router();

router.get('/overview', ...canRead, validate(reportOverviewQuerySchema, 'query'), asyncHandler(controller.overview));

module.exports = router;
