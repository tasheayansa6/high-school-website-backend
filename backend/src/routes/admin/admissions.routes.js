const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  adminAdmissionListQuerySchema,
  admissionIdParamSchema,
  updateAdmissionStatusBodySchema,
} = require('../../validators/admissions.schemas');
const adminAdmissionsController = require('../../controllers/adminAdmissions.controller');

const router = express.Router();

const canManageAdmissions = [
  authenticate,
  authorize(PERMISSIONS.ADMISSIONS_MANAGE),
];

const canRestoreAdmissions = [
  authenticate,
  authorize(PERMISSIONS.ADMISSIONS_RESTORE),
];

router.get(
  '/inquiries',
  ...canManageAdmissions,
  validate(adminAdmissionListQuerySchema, 'query'),
  asyncHandler(adminAdmissionsController.listInquiries)
);

router.get(
  '/inquiries/:id',
  ...canManageAdmissions,
  validate(admissionIdParamSchema, 'params'),
  asyncHandler(adminAdmissionsController.getInquiry)
);

router.patch(
  '/inquiries/:id/status',
  ...canManageAdmissions,
  validate(admissionIdParamSchema, 'params'),
  validate(updateAdmissionStatusBodySchema, 'body'),
  asyncHandler(adminAdmissionsController.updateStatus)
);

router.delete(
  '/inquiries/:id',
  ...canManageAdmissions,
  validate(admissionIdParamSchema, 'params'),
  asyncHandler(adminAdmissionsController.deleteInquiry)
);

router.patch(
  '/inquiries/:id/restore',
  ...canRestoreAdmissions,
  validate(admissionIdParamSchema, 'params'),
  asyncHandler(adminAdmissionsController.restoreInquiry)
);

module.exports = router;
