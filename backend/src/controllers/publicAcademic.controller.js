const publicAcademicService = require('../services/publicAcademic.service');
const { sendSuccess } = require('../utils/apiResponse');

async function overview(_req, res) {
  const data = await publicAcademicService.getOverview();

  return sendSuccess(res, {
    message: 'Public academic overview retrieved',
    data,
  });
}

module.exports = {
  overview,
};
