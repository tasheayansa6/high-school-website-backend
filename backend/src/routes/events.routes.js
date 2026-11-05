const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const {
  publicEventListQuerySchema,
  eventSlugParamSchema,
} = require('../validators/event.schemas');
const eventController = require('../controllers/event.controller');

const router = express.Router();

router.get(
  '/',
  validate(publicEventListQuerySchema, 'query'),
  asyncHandler(eventController.listPublicEvents)
);

router.get(
  '/:slug',
  validate(eventSlugParamSchema, 'params'),
  asyncHandler(eventController.getPublicEventBySlug)
);

module.exports = router;
