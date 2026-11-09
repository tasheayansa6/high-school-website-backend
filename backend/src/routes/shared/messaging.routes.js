/**
 * Factory for actor-scoped direct messaging routes.
 */
const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  conversationListQuerySchema,
  messageListQuerySchema,
  contactsQuerySchema,
  startConversationBodySchema,
  sendMessageBodySchema,
  idParamSchema,
} = require('../../validators/sms/messaging.schemas');
const controller = require('../../controllers/sms/messaging.controller');

function createMessagingRouter(authenticateMiddleware) {
  const router = express.Router();

  router.get(
    '/conversations',
    authenticateMiddleware,
    validate(conversationListQuerySchema, 'query'),
    asyncHandler(controller.listConversations)
  );
  router.get('/unread-count', authenticateMiddleware, asyncHandler(controller.unread));
  router.get(
    '/contacts',
    authenticateMiddleware,
    validate(contactsQuerySchema, 'query'),
    asyncHandler(controller.contacts)
  );
  router.post(
    '/conversations',
    authenticateMiddleware,
    validate(startConversationBodySchema, 'body'),
    asyncHandler(controller.start)
  );
  router.get(
    '/conversations/:id',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.getOne)
  );
  router.get(
    '/conversations/:id/messages',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    validate(messageListQuerySchema, 'query'),
    asyncHandler(controller.listMessages)
  );
  router.post(
    '/conversations/:id/messages',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    validate(sendMessageBodySchema, 'body'),
    asyncHandler(controller.send)
  );
  router.post(
    '/conversations/:id/read',
    authenticateMiddleware,
    validate(idParamSchema, 'params'),
    asyncHandler(controller.markRead)
  );

  return router;
}

module.exports = { createMessagingRouter };
