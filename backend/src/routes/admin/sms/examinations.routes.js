const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  examinationListQuerySchema,
  createExaminationBodySchema,
  updateExaminationBodySchema,
  examResultListQuerySchema,
  upsertExamResultsBodySchema,
  examResultParamsSchema,
} = require('../../../validators/sms/examination.schemas');
const { reopenMarksBodySchema } = require('../../../validators/sms/gradebook.schemas');
const controller = require('../../../controllers/sms/examination.controller');

const canManageExams = [authenticate, authorize(PERMISSIONS.EXAMS_MANAGE)];
const canManageResults = [authenticate, authorize(PERMISSIONS.RESULTS_MANAGE)];

const router = express.Router();

router.get('/', ...canManageExams, validate(examinationListQuerySchema, 'query'), asyncHandler(controller.listExaminations));

router.post('/', ...canManageExams, validate(createExaminationBodySchema, 'body'), asyncHandler(controller.createExamination));

router.get(
  '/:id',
  ...canManageExams,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getExamination)
);

router.patch(
  '/:id',
  ...canManageExams,
  validate(idParamSchema, 'params'),
  validate(updateExaminationBodySchema, 'body'),
  asyncHandler(controller.updateExamination)
);

router.post('/:id/publish', ...canManageExams, validate(idParamSchema, 'params'), asyncHandler(controller.publishExamination));

router.post(
  '/:id/unpublish',
  ...canManageExams,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.unpublishExamination)
);

router.post(
  '/:id/reopen',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(reopenMarksBodySchema, 'body'),
  asyncHandler(controller.reopenExamination)
);

router.delete('/:id', ...canManageExams, validate(idParamSchema, 'params'), asyncHandler(controller.deleteExamination));

// Results (RESULTS_MANAGE)
router.get(
  '/:id/results',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(examResultListQuerySchema, 'query'),
  asyncHandler(controller.listResults)
);

router.put(
  '/:id/results',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(upsertExamResultsBodySchema, 'body'),
  asyncHandler(controller.upsertResults)
);

router.post(
  '/:id/results',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(upsertExamResultsBodySchema, 'body'),
  asyncHandler(controller.upsertResults)
);

router.delete(
  '/:id/results/:resultId',
  ...canManageResults,
  validate(examResultParamsSchema, 'params'),
  asyncHandler(controller.deleteResult)
);

module.exports = router;
