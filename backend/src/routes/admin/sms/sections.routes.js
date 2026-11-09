const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  catalogListQuerySchema,
  createSectionBodySchema,
  updateSectionBodySchema,
} = require('../../../validators/sms/academic.schemas');
const sectionController = require('../../../controllers/sms/section.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(catalogListQuerySchema, 'query'),
  asyncHandler(sectionController.list)
);

router.post(
  '/',
  ...canManage,
  validate(createSectionBodySchema, 'body'),
  asyncHandler(sectionController.create)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(sectionController.get)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateSectionBodySchema, 'body'),
  asyncHandler(sectionController.update)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(sectionController.remove)
);

module.exports = router;
