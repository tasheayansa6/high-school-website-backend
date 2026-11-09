const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  teachingAssignmentListQuerySchema,
  createTeachingAssignmentBodySchema,
} = require('../../../validators/sms/academic.schemas');
const teachingAssignmentController = require('../../../controllers/sms/teachingAssignment.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(teachingAssignmentListQuerySchema, 'query'),
  asyncHandler(teachingAssignmentController.listTeachingAssignments)
);

router.post(
  '/',
  ...canManage,
  validate(createTeachingAssignmentBodySchema, 'body'),
  asyncHandler(teachingAssignmentController.createTeachingAssignment)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(teachingAssignmentController.getTeachingAssignment)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(teachingAssignmentController.deleteTeachingAssignment)
);

module.exports = router;
