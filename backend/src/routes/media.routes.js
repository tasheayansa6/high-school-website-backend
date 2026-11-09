const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const { mediaPublicIdParamSchema } = require('../validators/media.schemas');
const mediaController = require('../controllers/media.controller');

const router = express.Router();

router.get(
  '/:publicId/content',
  validate(mediaPublicIdParamSchema, 'params'),
  asyncHandler(mediaController.streamMediaContent)
);

module.exports = router;
