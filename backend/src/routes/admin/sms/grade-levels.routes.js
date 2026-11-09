const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  catalogListQuerySchema,
  createGradeLevelBodySchema,
  updateGradeLevelBodySchema,
} = require('../../../validators/sms/academic.schemas');
const gradeLevelController = require('../../../controllers/sms/gradeLevel.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(catalogListQuerySchema, 'query'),
  asyncHandler(gradeLevelController.list)
);

router.post(
  '/',
  ...canManage,
  validate(createGradeLevelBodySchema, 'body'),
  asyncHandler(gradeLevelController.create)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(gradeLevelController.get)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateGradeLevelBodySchema, 'body'),
  asyncHandler(gradeLevelController.update)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(gradeLevelController.remove)
);

module.exports = router;
