const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const { listQuerySchema } = require('../../../validators/sms/learningMaterial.schemas');
const controller = require('../../../controllers/sms/learningMaterial.controller');

const canManage = [authenticate, authorize(PERMISSIONS.LEARNING_MATERIALS_MANAGE)];

const router = express.Router();

router.get(
  '/stats',
  ...canManage,
  validate(listQuerySchema, 'query'),
  asyncHandler(controller.adminStats)
);
router.get(
  '/',
  ...canManage,
  validate(listQuerySchema, 'query'),
  asyncHandler(controller.adminList)
);
router.get(
  '/:id/download',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.adminDownload)
);
router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.adminGet)
);
router.post(
  '/:id/publish',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.adminPublish)
);
router.post(
  '/:id/unpublish',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.adminUnpublish)
);
router.post(
  '/:id/archive',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.adminArchive)
);
router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.adminDelete)
);

module.exports = router;
