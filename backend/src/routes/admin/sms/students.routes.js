const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  createStudentBodySchema,
  updateStudentBodySchema,
  studentListQuerySchema,
} = require('../../../validators/sms/student.schemas');
const studentController = require('../../../controllers/sms/student.controller');

const canManage = [authenticate, authorize(PERMISSIONS.STUDENTS_MANAGE)];
const canRestore = [authenticate, authorize(PERMISSIONS.STUDENTS_RESTORE)];

const router = express.Router();

router.get(
  '/',
  ...canManage,
  validate(studentListQuerySchema, 'query'),
  asyncHandler(studentController.listStudents)
);

router.post(
  '/',
  ...canManage,
  validate(createStudentBodySchema, 'body'),
  asyncHandler(studentController.createStudent)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(studentController.getStudent)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateStudentBodySchema, 'body'),
  asyncHandler(studentController.updateStudent)
);

router.patch(
  '/:id/activate',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(studentController.activateStudent)
);

router.patch(
  '/:id/deactivate',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(studentController.deactivateStudent)
);

router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(studentController.deleteStudent)
);

router.patch(
  '/:id/restore',
  ...canRestore,
  validate(idParamSchema, 'params'),
  asyncHandler(studentController.restoreStudent)
);

module.exports = router;
