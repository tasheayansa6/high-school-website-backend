const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  adminSettingsListQuerySchema,
  settingKeyParamSchema,
  upsertSettingsBodySchema,
  patchSettingBodySchema,
} = require('../../validators/settings.schemas');
const adminSettingsController = require('../../controllers/adminSettings.controller');

const router = express.Router();

const canManageSettings = [authenticate, authorize(PERMISSIONS.SETTINGS_MANAGE)];

router.get(
  '/',
  ...canManageSettings,
  validate(adminSettingsListQuerySchema, 'query'),
  asyncHandler(adminSettingsController.listSettings)
);

router.put(
  '/',
  ...canManageSettings,
  validate(upsertSettingsBodySchema, 'body'),
  asyncHandler(adminSettingsController.upsertSettings)
);

router.get(
  '/:key',
  ...canManageSettings,
  validate(settingKeyParamSchema, 'params'),
  asyncHandler(adminSettingsController.getSetting)
);

router.patch(
  '/:key',
  ...canManageSettings,
  validate(settingKeyParamSchema, 'params'),
  validate(patchSettingBodySchema, 'body'),
  asyncHandler(adminSettingsController.patchSetting)
);

router.delete(
  '/:key',
  ...canManageSettings,
  validate(settingKeyParamSchema, 'params'),
  asyncHandler(adminSettingsController.deleteSetting)
);

module.exports = router;
