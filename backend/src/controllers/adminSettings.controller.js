const settingsService = require('../services/settings.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listSettings(req, res) {
  const result = await settingsService.listAdminSettings(req.validated.query);
  return sendSuccess(res, {
    message: 'Website settings retrieved',
    data: result,
  });
}

async function getSetting(req, res) {
  const setting = await settingsService.getAdminSettingByKey(req.validated.params.key);
  return sendSuccess(res, {
    message: 'Website setting retrieved',
    data: { setting },
  });
}

async function upsertSettings(req, res) {
  const result = await settingsService.upsertManySettings(
    req.validated.body.settings,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Website settings saved',
    data: result,
  });
}

async function patchSetting(req, res) {
  const setting = await settingsService.patchSetting(
    req.validated.params.key,
    req.validated.body.value,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Website setting updated',
    data: { setting },
  });
}

async function deleteSetting(req, res) {
  const result = await settingsService.deleteSetting(
    req.validated.params.key,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Website setting deleted',
    data: result,
  });
}

module.exports = {
  listSettings,
  getSetting,
  upsertSettings,
  patchSetting,
  deleteSetting,
};
