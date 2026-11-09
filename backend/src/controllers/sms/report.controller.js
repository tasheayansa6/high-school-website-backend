const reportService = require('../../services/sms/report.service');
const { sendSuccess } = require('../../utils/apiResponse');

async function overview(req, res) {
  const data = await reportService.getOverview(req.validated.query);
  return sendSuccess(res, { message: 'Report overview retrieved', data });
}

module.exports = { overview };
