const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  createEventBodySchema,
  updateEventBodySchema,
  adminEventListQuerySchema,
  eventIdParamSchema,
  adminEventGetQuerySchema,
} = require('../../validators/event.schemas');
const adminEventController = require('../../controllers/adminEvent.controller');

const router = express.Router();

const canManageEvents = [authenticate, authorize(PERMISSIONS.EVENTS_MANAGE)];
const canRestoreEvents = [authenticate, authorize(PERMISSIONS.EVENTS_RESTORE)];

router.get(
  '/',
  ...canManageEvents,
  validate(adminEventListQuerySchema, 'query'),
  asyncHandler(adminEventController.listEvents)
);

router.post(
  '/',
  ...canManageEvents,
  validate(createEventBodySchema, 'body'),
  asyncHandler(adminEventController.createEvent)
);

router.get(
  '/:id',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  validate(adminEventGetQuerySchema, 'query'),
  asyncHandler(adminEventController.getEvent)
);

router.patch(
  '/:id',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  validate(updateEventBodySchema, 'body'),
  asyncHandler(adminEventController.updateEvent)
);

router.patch(
  '/:id/publish',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  asyncHandler(adminEventController.publishEvent)
);

router.patch(
  '/:id/unpublish',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  asyncHandler(adminEventController.unpublishEvent)
);

router.patch(
  '/:id/cancel',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  asyncHandler(adminEventController.cancelEvent)
);

router.delete(
  '/:id',
  ...canManageEvents,
  validate(eventIdParamSchema, 'params'),
  asyncHandler(adminEventController.deleteEvent)
);

router.patch(
  '/:id/restore',
  ...canRestoreEvents,
  validate(eventIdParamSchema, 'params'),
  asyncHandler(adminEventController.restoreEvent)
);

module.exports = router;
