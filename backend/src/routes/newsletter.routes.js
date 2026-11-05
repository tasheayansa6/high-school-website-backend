const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const newsletterRateLimiter = require('../middleware/newsletterRateLimiter');
const {
  subscribeBodySchema,
  confirmQuerySchema,
  unsubscribeBodySchema,
} = require('../validators/newsletter.schemas');
const newsletterController = require('../controllers/newsletter.controller');

const router = express.Router();

router.post(
  '/subscribe',
  newsletterRateLimiter,
  validate(subscribeBodySchema, 'body'),
  asyncHandler(newsletterController.subscribe)
);

router.get(
  '/confirm',
  newsletterRateLimiter,
  validate(confirmQuerySchema, 'query'),
  asyncHandler(newsletterController.confirm)
);

router.post(
  '/unsubscribe',
  validate(unsubscribeBodySchema, 'body'),
  asyncHandler(newsletterController.unsubscribe)
);

module.exports = router;
