const settingsService = require('../services/settings.service');
const { sendSuccess } = require('../utils/apiResponse');

async function getPublicSettings(req, res) {
  const result = await settingsService.getPublicSettings();
  return sendSuccess(res, {
    message: 'Public website settings retrieved',
    data: result,
  });
}

module.exports = {
  getPublicSettings,
};
