const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  studentFeeListQuerySchema,
  assignStudentFeeBodySchema,
  updateStudentFeeBodySchema,
  recordPaymentBodySchema,
  feePaymentParamsSchema,
} = require('../../../validators/sms/fee.schemas');
const controller = require('../../../controllers/sms/fee.controller');

const canManage = [authenticate, authorize(PERMISSIONS.FEES_MANAGE)];

const router = express.Router();

router.get('/', ...canManage, validate(studentFeeListQuerySchema, 'query'), asyncHandler(controller.listStudentFees));

router.post('/', ...canManage, validate(assignStudentFeeBodySchema, 'body'), asyncHandler(controller.assignStudentFee));

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getStudentFee)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateStudentFeeBodySchema, 'body'),
  asyncHandler(controller.updateStudentFee)
);

router.delete('/:id', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.deleteStudentFee));

router.get(
  '/:id/payments',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.listPayments)
);

router.post(
  '/:id/payments',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(recordPaymentBodySchema, 'body'),
  asyncHandler(controller.recordPayment)
);

router.delete(
  '/:id/payments/:paymentId',
  ...canManage,
  validate(feePaymentParamsSchema, 'params'),
  asyncHandler(controller.deletePayment)
);

module.exports = router;
