const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  recentActivityQuerySchema,
  inquiryStatisticsQuerySchema,
} = require('../../validators/dashboard.schemas');
const adminDashboardController = require('../../controllers/adminDashboard.controller');

const router = express.Router();

const canReadDashboard = [authenticate, authorize(PERMISSIONS.DASHBOARD_READ)];

router.get(
  '/overview',
  ...canReadDashboard,
  asyncHandler(adminDashboardController.getOverview)
);

router.get(
  '/recent-activity',
  ...canReadDashboard,
  validate(recentActivityQuerySchema, 'query'),
  asyncHandler(adminDashboardController.getRecentActivity)
);

router.get(
  '/content-statistics',
  ...canReadDashboard,
  asyncHandler(adminDashboardController.getContentStatistics)
);

router.get(
  '/inquiry-statistics',
  ...canReadDashboard,
  validate(inquiryStatisticsQuerySchema, 'query'),
  asyncHandler(adminDashboardController.getInquiryStatistics)
);

module.exports = router;
