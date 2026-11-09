const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');
const { z } = require('zod');

const { idParamSchema, includeDeletedQuerySchema, idField } = require('../../../validators/sms/common');
const {
  classroomListQuerySchema,
  createClassroomBodySchema,
  updateClassroomBodySchema,
  timetableListQuerySchema,
  createTimetableBodySchema,
  updateTimetableBodySchema,
  createEntryBodySchema,
  updateEntryBodySchema,
  conflictCheckQuerySchema,
} = require('../../../validators/sms/timetable.schemas');
const controller = require('../../../controllers/sms/timetable.controller');

const canManage = [authenticate, authorize(PERMISSIONS.TIMETABLES_MANAGE)];

const entryIdParamSchema = z.object({
  id: idField,
  entryId: idField,
});

const router = express.Router();

// Classrooms
router.get(
  '/classrooms',
  ...canManage,
  validate(classroomListQuerySchema, 'query'),
  asyncHandler(controller.listClassrooms)
);
router.post(
  '/classrooms',
  ...canManage,
  validate(createClassroomBodySchema, 'body'),
  asyncHandler(controller.createClassroom)
);
router.patch(
  '/classrooms/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateClassroomBodySchema, 'body'),
  asyncHandler(controller.updateClassroom)
);
router.delete(
  '/classrooms/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.deleteClassroom)
);

// Conflict preview
router.get(
  '/conflicts',
  ...canManage,
  validate(conflictCheckQuerySchema, 'query'),
  asyncHandler(controller.checkConflicts)
);

// Timetables
router.get(
  '/',
  ...canManage,
  validate(timetableListQuerySchema, 'query'),
  asyncHandler(controller.listTimetables)
);
router.post(
  '/',
  ...canManage,
  validate(createTimetableBodySchema, 'body'),
  asyncHandler(controller.createTimetable)
);
router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getTimetable)
);
router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateTimetableBodySchema, 'body'),
  asyncHandler(controller.updateTimetable)
);
router.post(
  '/:id/publish',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.publishTimetable)
);
router.post(
  '/:id/unpublish',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.unpublishTimetable)
);
router.delete(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.deleteTimetable)
);

// Entries
router.post(
  '/:id/entries',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(createEntryBodySchema, 'body'),
  asyncHandler(controller.createEntry)
);
router.patch(
  '/:id/entries/:entryId',
  ...canManage,
  validate(entryIdParamSchema, 'params'),
  validate(updateEntryBodySchema, 'body'),
  asyncHandler(controller.updateEntry)
);
router.delete(
  '/:id/entries/:entryId',
  ...canManage,
  validate(entryIdParamSchema, 'params'),
  asyncHandler(controller.deleteEntry)
);

module.exports = router;
