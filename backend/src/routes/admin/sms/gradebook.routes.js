const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  createGradingScaleBodySchema,
  updateGradingScaleBodySchema,
  createAssessmentCategoryBodySchema,
  updateAssessmentCategoryBodySchema,
  validateWeightsBodySchema,
  gradebookOverviewQuerySchema,
  classSubjectGradebookQuerySchema,
  pendingSubmissionsQuerySchema,
  reopenMarksBodySchema,
  categoriesListQuerySchema,
} = require('../../../validators/sms/gradebook.schemas');
const controller = require('../../../controllers/sms/gradebook.controller');

/** Sensitive academic gradebook config — not granted to CMS content roles. */
const canManageGradebook = [authenticate, authorize(PERMISSIONS.GRADEBOOK_MANAGE)];
const canManageResults = [authenticate, authorize(PERMISSIONS.RESULTS_MANAGE)];

const router = express.Router();

router.get(
  '/overview',
  ...canManageGradebook,
  validate(gradebookOverviewQuerySchema, 'query'),
  asyncHandler(controller.overview)
);

router.get(
  '/class-subject',
  ...canManageGradebook,
  validate(classSubjectGradebookQuerySchema, 'query'),
  asyncHandler(controller.classSubject)
);

router.get(
  '/pending',
  ...canManageResults,
  validate(pendingSubmissionsQuerySchema, 'query'),
  asyncHandler(controller.pending)
);

router.post(
  '/examinations/:id/approve',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.approveExamination)
);

router.post(
  '/examinations/:id/reject',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(reopenMarksBodySchema, 'body'),
  asyncHandler(controller.rejectExamination)
);

router.post(
  '/examinations/:id/reopen',
  ...canManageResults,
  validate(idParamSchema, 'params'),
  validate(reopenMarksBodySchema, 'body'),
  asyncHandler(controller.reopenExamination)
);

router.post(
  '/validate-weights',
  ...canManageGradebook,
  validate(validateWeightsBodySchema, 'body'),
  asyncHandler(controller.validateWeights)
);

router.get('/scales', ...canManageGradebook, asyncHandler(controller.listScales));
router.post(
  '/scales',
  ...canManageGradebook,
  validate(createGradingScaleBodySchema, 'body'),
  asyncHandler(controller.createScale)
);
router.get(
  '/scales/:id',
  ...canManageGradebook,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getScale)
);
router.patch(
  '/scales/:id',
  ...canManageGradebook,
  validate(idParamSchema, 'params'),
  validate(updateGradingScaleBodySchema, 'body'),
  asyncHandler(controller.updateScale)
);
router.delete(
  '/scales/:id',
  ...canManageGradebook,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.deleteScale)
);

router.get(
  '/categories',
  ...canManageGradebook,
  validate(categoriesListQuerySchema, 'query'),
  asyncHandler(controller.listCategories)
);
router.post(
  '/categories',
  ...canManageGradebook,
  validate(createAssessmentCategoryBodySchema, 'body'),
  asyncHandler(controller.createCategory)
);
router.patch(
  '/categories/:id',
  ...canManageGradebook,
  validate(idParamSchema, 'params'),
  validate(updateAssessmentCategoryBodySchema, 'body'),
  asyncHandler(controller.updateCategory)
);
router.delete(
  '/categories/:id',
  ...canManageGradebook,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.deleteCategory)
);

module.exports = router;
