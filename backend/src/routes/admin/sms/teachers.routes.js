const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  createTeacherBodySchema,
  updateTeacherBodySchema,
  teacherListQuerySchema,
} = require('../../../validators/sms/teacher.schemas');
const teacherController = require('../../../controllers/sms/teacher.controller');

const canManage = [authenticate, authorize(PERMISSIONS.TEACHERS_MANAGE)];
const canRestore = [authenticate, authorize(PERMISSIONS.TEACHERS_RESTORE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(teacherListQuerySchema, 'query'),
  asyncHandler(teacherController.listTeachers)
);

router.post(
  '/',
  ...canManage,
  validate(createTeacherBodySchema, 'body'),
  asyncHandler(teacherController.createTeacher)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(teacherController.getTeacher)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateTeacherBodySchema, 'body'),
  asyncHandler(teacherController.updateTeacher)
);

router.patch(
  '/:id/activate',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(teacherController.activateTeacher)
);

router.patch(
  '/:id/deactivate',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(teacherController.deactivateTeacher)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(teacherController.deleteTeacher)
);

router.patch(
  '/:id/restore',
  ...canRestore,
  validate(idParamSchema, 'params'),
  asyncHandler(teacherController.restoreTeacher)
);

module.exports = router;
