const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  enrollmentListQuerySchema,
  createEnrollmentBodySchema,
  updateEnrollmentStatusBodySchema,
} = require('../../../validators/sms/enrollment.schemas');
const enrollmentController = require('../../../controllers/sms/enrollment.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ENROLLMENTS_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(enrollmentListQuerySchema, 'query'),
  asyncHandler(enrollmentController.listEnrollments)
);

router.post(
  '/',
  ...canManage,
  validate(createEnrollmentBodySchema, 'body'),
  asyncHandler(enrollmentController.createEnrollment)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(enrollmentController.getEnrollment)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateEnrollmentStatusBodySchema, 'body'),
  asyncHandler(enrollmentController.updateEnrollmentStatus)
);

router.patch(
  '/:id/status',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateEnrollmentStatusBodySchema, 'body'),
  asyncHandler(enrollmentController.updateEnrollmentStatus)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(enrollmentController.deleteEnrollment)
);

module.exports = router;
