const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  academicYearListQuerySchema,
  createAcademicYearBodySchema,
  updateAcademicYearBodySchema,
  createAcademicTermBodySchema,
  updateAcademicTermBodySchema,
  termParamsSchema,
} = require('../../../validators/sms/academic.schemas');
const academicYearController = require('../../../controllers/sms/academicYear.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ACADEMIC_MANAGE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(academicYearListQuerySchema, 'query'),
  asyncHandler(academicYearController.listAcademicYears)
);

router.post(
  '/',
  ...canManage,
  validate(createAcademicYearBodySchema, 'body'),
  asyncHandler(academicYearController.createAcademicYear)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(academicYearController.getAcademicYear)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateAcademicYearBodySchema, 'body'),
  asyncHandler(academicYearController.updateAcademicYear)
);

router.patch(
  '/:id/set-current',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(academicYearController.setCurrentAcademicYear)
);

router.get(
  '/:id/terms',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(academicYearController.listTerms)
);

router.post(
  '/:id/terms',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(createAcademicTermBodySchema, 'body'),
  asyncHandler(academicYearController.createTerm)
);

router.patch(
  '/:id/terms/:termId',
  ...canManage,
  validate(termParamsSchema, 'params'),
  validate(updateAcademicTermBodySchema, 'body'),
  asyncHandler(academicYearController.updateTerm)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(academicYearController.deleteAcademicYear)
);

module.exports = router;
