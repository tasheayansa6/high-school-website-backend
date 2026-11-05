const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const mediaUploadSingle = require('../../middleware/mediaUpload');
const mediaRateLimiter = require('../../middleware/mediaRateLimiter');
const { PERMISSIONS } = require('../../config/roles');
const {
  uploadMediaFieldsSchema,
  updateMediaBodySchema,
  adminMediaListQuerySchema,
  mediaIdParamSchema,
  adminMediaGetQuerySchema,
} = require('../../validators/media.schemas');
const adminMediaController = require('../../controllers/adminMedia.controller');

const router = express.Router();

const canManageMedia = [authenticate, authorize(PERMISSIONS.MEDIA_MANAGE)];
const canRestoreMedia = [authenticate, authorize(PERMISSIONS.MEDIA_RESTORE)];

router.get(
  '/',
  ...canManageMedia,
  validate(adminMediaListQuerySchema, 'query'),
  asyncHandler(adminMediaController.listMedia)
);

router.post(
  '/upload',
  ...canManageMedia,
  mediaRateLimiter,
  mediaUploadSingle,
  validate(uploadMediaFieldsSchema, 'body'),
  asyncHandler(adminMediaController.upload)
);

router.get(
  '/:id',
  ...canManageMedia,
  validate(mediaIdParamSchema, 'params'),
  validate(adminMediaGetQuerySchema, 'query'),
  asyncHandler(adminMediaController.getMedia)
);

router.patch(
  '/:id',
  ...canManageMedia,
  validate(mediaIdParamSchema, 'params'),
  validate(updateMediaBodySchema, 'body'),
  asyncHandler(adminMediaController.updateMedia)
);

router.delete(
  '/:id',
  ...canManageMedia,
  validate(mediaIdParamSchema, 'params'),
  asyncHandler(adminMediaController.deleteMedia)
);

router.patch(
  '/:id/restore',
  ...canRestoreMedia,
  validate(mediaIdParamSchema, 'params'),
  asyncHandler(adminMediaController.restoreMedia)
);

module.exports = router;
