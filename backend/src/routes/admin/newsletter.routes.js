const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  adminSubscriberListQuerySchema,
  subscriberIdParamSchema,
  updateSubscriberStatusBodySchema,
} = require('../../validators/newsletter.schemas');
const adminNewsletterController = require('../../controllers/adminNewsletter.controller');

const router = express.Router();

const canManageNewsletter = [
  authenticate,
  authorize(PERMISSIONS.NEWSLETTER_MANAGE),
];

const canRestoreNewsletter = [
  authenticate,
  authorize(PERMISSIONS.NEWSLETTER_RESTORE),
];

router.get(
  '/subscribers',
  ...canManageNewsletter,
  validate(adminSubscriberListQuerySchema, 'query'),
  asyncHandler(adminNewsletterController.listSubscribers)
);

router.get(
  '/subscribers/:id',
  ...canManageNewsletter,
  validate(subscriberIdParamSchema, 'params'),
  asyncHandler(adminNewsletterController.getSubscriber)
);

router.patch(
  '/subscribers/:id/status',
  ...canManageNewsletter,
  validate(subscriberIdParamSchema, 'params'),
  validate(updateSubscriberStatusBodySchema, 'body'),
  asyncHandler(adminNewsletterController.updateStatus)
);

router.delete(
  '/subscribers/:id',
  ...canManageNewsletter,
  validate(subscriberIdParamSchema, 'params'),
  asyncHandler(adminNewsletterController.deleteSubscriber)
);

router.patch(
  '/subscribers/:id/restore',
  ...canRestoreNewsletter,
  validate(subscriberIdParamSchema, 'params'),
  asyncHandler(adminNewsletterController.restoreSubscriber)
);

module.exports = router;
