const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  attendanceListQuerySchema,
  upsertAttendanceBodySchema,
  bulkAttendanceBodySchema,
} = require('../../../validators/sms/attendance.schemas');
const controller = require('../../../controllers/sms/attendance.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ATTENDANCE_MANAGE)];

const router = express.Router();

router.get('/', ...canManage, validate(attendanceListQuerySchema, 'query'), asyncHandler(controller.listAttendance));

router.post('/', ...canManage, validate(upsertAttendanceBodySchema, 'body'), asyncHandler(controller.upsertAttendance));

router.post(
  '/bulk',
  ...canManage,
  validate(bulkAttendanceBodySchema, 'body'),
  asyncHandler(controller.bulkUpsertAttendance)
);

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getAttendance)
);

router.delete('/:id', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.deleteAttendance));

module.exports = router;
