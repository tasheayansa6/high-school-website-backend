const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const contactRateLimiter = require('../middleware/contactRateLimiter');
const { createContactBodySchema } = require('../validators/contact.schemas');
const contactController = require('../controllers/contact.controller');

const router = express.Router();

router.post(
  '/',
  contactRateLimiter,
  validate(createContactBodySchema, 'body'),
  asyncHandler(contactController.submitContact)
);

module.exports = router;
