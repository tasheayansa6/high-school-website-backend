const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  assignmentListQuerySchema,
  createAssignmentBodySchema,
  updateAssignmentBodySchema,
  submissionListQuerySchema,
  gradeSubmissionBodySchema,
  assignmentSubmissionParamsSchema,
} = require('../../../validators/sms/assignment.schemas');
const controller = require('../../../controllers/sms/assignment.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ASSIGNMENTS_MANAGE)];

const router = express.Router();

router.get('/', ...canManage, validate(assignmentListQuerySchema, 'query'), asyncHandler(controller.listAssignments));

router.post('/', ...canManage, validate(createAssignmentBodySchema, 'body'), asyncHandler(controller.createAssignment));

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getAssignment)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateAssignmentBodySchema, 'body'),
  asyncHandler(controller.updateAssignment)
);

router.delete('/:id', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.deleteAssignment));

router.get(
  '/:id/submissions',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(submissionListQuerySchema, 'query'),
  asyncHandler(controller.listSubmissions)
);

router.patch(
  '/:id/submissions/:submissionId/grade',
  ...canManage,
  validate(assignmentSubmissionParamsSchema, 'params'),
  validate(gradeSubmissionBodySchema, 'body'),
  asyncHandler(controller.gradeSubmission)
);

module.exports = router;
