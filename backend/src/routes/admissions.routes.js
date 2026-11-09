const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const admissionsRateLimiter = require('../middleware/admissionsRateLimiter');
const { createAdmissionInquiryBodySchema } = require('../validators/admissions.schemas');
const admissionsController = require('../controllers/admissions.controller');

const router = express.Router();

router.post(
  '/inquiries',
  admissionsRateLimiter,
  validate(createAdmissionInquiryBodySchema, 'body'),
  asyncHandler(admissionsController.submitInquiry)
);

module.exports = router;
