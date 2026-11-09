const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  classOfferingListQuerySchema,
  createClassOfferingBodySchema,
  updateClassOfferingBodySchema,
} = require('../../../validators/sms/academic.schemas');
const classOfferingController = require('../../../controllers/sms/classOffering.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(classOfferingListQuerySchema, 'query'),
  asyncHandler(classOfferingController.listClassOfferings)
);

router.post(
  '/',
  ...canManage,
  validate(createClassOfferingBodySchema, 'body'),
  asyncHandler(classOfferingController.createClassOffering)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(classOfferingController.getClassOffering)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateClassOfferingBodySchema, 'body'),
  asyncHandler(classOfferingController.updateClassOffering)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(classOfferingController.deleteClassOffering)
);

module.exports = router;
