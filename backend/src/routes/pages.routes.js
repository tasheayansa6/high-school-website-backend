const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const {
  publicPageListQuerySchema,
  pageSlugParamSchema,
} = require('../validators/page.schemas');
const pageController = require('../controllers/page.controller');

const router = express.Router();

router.get(
  '/',
  validate(publicPageListQuerySchema, 'query'),
  asyncHandler(pageController.listPublicPages)
);

router.get(
  '/:slug',
  validate(pageSlugParamSchema, 'params'),
  asyncHandler(pageController.getPublicPageBySlug)
);

module.exports = router;
