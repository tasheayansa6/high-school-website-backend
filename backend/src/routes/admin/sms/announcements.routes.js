const express = require('express');
const asyncHandler = require('../../../middleware/asyncHandler');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { authorize } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../config/roles');

const { idParamSchema, includeDeletedQuerySchema } = require('../../../validators/sms/common');
const {
  announcementListQuerySchema,
  createAnnouncementBodySchema,
  updateAnnouncementBodySchema,
} = require('../../../validators/sms/announcement.schemas');
const controller = require('../../../controllers/sms/announcement.controller');

const canManage = [authenticate, authorize(PERMISSIONS.ANNOUNCEMENTS_MANAGE)];

const router = express.Router();

router.get('/', ...canManage, validate(announcementListQuerySchema, 'query'), asyncHandler(controller.listAnnouncements));

router.post('/', ...canManage, validate(createAnnouncementBodySchema, 'body'), asyncHandler(controller.createAnnouncement));

router.get(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(includeDeletedQuerySchema, 'query'),
  asyncHandler(controller.getAnnouncement)
);

router.patch(
  '/:id',
  ...canManage,
  validate(idParamSchema, 'params'),
  validate(updateAnnouncementBodySchema, 'body'),
  asyncHandler(controller.updateAnnouncement)
);

router.post('/:id/publish', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.publishAnnouncement));

router.delete('/:id', ...canManage, validate(idParamSchema, 'params'), asyncHandler(controller.deleteAnnouncement));

module.exports = router;
