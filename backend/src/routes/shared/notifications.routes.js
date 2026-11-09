/**
 * Factory for actor-scoped notification routes.
 * Auth middleware is provided by the caller (admin / teacher / student).
 */
const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  notificationListQuerySchema,
  idParamSchema,
} = require('../../validators/sms/notification.schemas');
const controller = require('../../controllers/sms/notification.controller');

function createNotificationRouter(authenticateMiddleware) {
  const router = express.Router();

  router.get(
    '/',
    authenticateMiddleware,
    validate(notificationListQuerySchema, 'query'),
    asyncHandler(controller.list)
  );
  router.get('/unread-count', authenticateMiddleware, asyncHandler(controller.unread));
  router.post('/read-all', authenticateMiddleware, asyncHandler(controller.markAllRead));
  router.get(
    '/:id',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.getOne)
  );
  router.post(
    '/:id/read',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.markRead)
  );
  router.post(
    '/:id/archive',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.archive)
  );
  router.delete(
    '/:id',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.remove)
  );

  return router;
}

module.exports = { createNotificationRouter };
