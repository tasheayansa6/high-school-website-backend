const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  catalogListQuerySchema,
  createSubjectBodySchema,
  updateSubjectBodySchema,
} = require('../../../validators/sms/academic.schemas');
const subjectController = require('../../../controllers/sms/subject.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(catalogListQuerySchema, 'query'),
  asyncHandler(subjectController.list)
);

router.post(
  '/',
  ...canManage,
  validate(createSubjectBodySchema, 'body'),
  asyncHandler(subjectController.create)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(subjectController.get)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateSubjectBodySchema, 'body'),
  asyncHandler(subjectController.update)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(subjectController.remove)
);

module.exports = router;
