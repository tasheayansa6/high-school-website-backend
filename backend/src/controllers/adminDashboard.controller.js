const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/apiResponse');

async function getOverview(req, res) {
  const overview = await dashboardService.getOverview();
  return sendSuccess(res, {
    message: 'Dashboard overview retrieved',
    data: { overview },
  });
}

async function getRecentActivity(req, res) {
  const result = await dashboardService.getRecentActivity(req.validated.query);
  return sendSuccess(res, {
    message: 'Recent activity retrieved',
    data: result,
  });
}

async function getContentStatistics(req, res) {
  const statistics = await dashboardService.getContentStatistics();
  return sendSuccess(res, {
    message: 'Content statistics retrieved',
    data: { statistics },
  });
}

async function getInquiryStatistics(req, res) {
  const statistics = await dashboardService.getInquiryStatistics(req.validated.query);
  return sendSuccess(res, {
    message: 'Inquiry statistics retrieved',
    data: { statistics },
  });
}

module.exports = {
  getOverview,
  getRecentActivity,
  getContentStatistics,
  getInquiryStatistics,
};
