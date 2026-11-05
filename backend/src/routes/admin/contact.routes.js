const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  adminContactListQuerySchema,
  contactIdParamSchema,
  updateContactStatusBodySchema,
} = require('../../validators/contact.schemas');
const adminContactController = require('../../controllers/adminContact.controller');

const router = express.Router();

const canManageContact = [
  authenticate,
  authorize(PERMISSIONS.CONTACT_MANAGE),
];

const canRestoreContact = [
  authenticate,
  authorize(PERMISSIONS.CONTACT_RESTORE),
];

router.get(
  '/',
  ...canManageContact,
  validate(adminContactListQuerySchema, 'query'),
  asyncHandler(adminContactController.listMessages)
);

router.get(
  '/:id',
  ...canManageContact,
  validate(contactIdParamSchema, 'params'),
  asyncHandler(adminContactController.getMessage)
);

router.patch(
  '/:id/status',
  ...canManageContact,
  validate(contactIdParamSchema, 'params'),
  validate(updateContactStatusBodySchema, 'body'),
  asyncHandler(adminContactController.updateStatus)
);

router.delete(
  '/:id',
  ...canManageContact,
  validate(contactIdParamSchema, 'params'),
  asyncHandler(adminContactController.deleteMessage)
);

router.patch(
  '/:id/restore',
  ...canRestoreContact,
  validate(contactIdParamSchema, 'params'),
  asyncHandler(adminContactController.restoreMessage)
);

module.exports = router;
