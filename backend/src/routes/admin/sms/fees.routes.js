const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  feeStructureListQuerySchema,
  createFeeStructureBodySchema,
  updateFeeStructureBodySchema,
} = require('../../../validators/sms/fee.schemas');
const controller = require('../../../controllers/sms/fee.controller');

const canManage = [authenticate, authorize(PERMISSIONS.FEES_MANAGE)];

const router = express.Router();

router.get('/', ...canManage, validate(feeStructureListQuerySchema, 'query'), asyncHandler(controller.listFeeStructures));

router.post('/', ...canManage, validate(createFeeStructureBodySchema, 'body'), asyncHandler(controller.createFeeStructure));

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getFeeStructure)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateFeeStructureBodySchema, 'body'),
  asyncHandler(controller.updateFeeStructure)
);

router.delete('/:id', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.deleteFeeStructure));

module.exports = router;
