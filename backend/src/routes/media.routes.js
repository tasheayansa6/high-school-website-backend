const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const { mediaIdParamSchema } = require('../validators/media.schemas');
const mediaController = require('../controllers/media.controller');

const router = express.Router();

router.get(
  '/:id/content',
  validate(mediaIdParamSchema, 'params'),
  asyncHandler(mediaController.streamMediaContent)
);

module.exports = router;
