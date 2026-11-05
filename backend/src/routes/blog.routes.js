const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const {
  publicPostListQuerySchema,
  postSlugParamSchema,
  categorySlugParamSchema,
} = require('../validators/blog.schemas');
const blogController = require('../controllers/blog.controller');

const router = express.Router();

router.get(
  '/posts',
  validate(publicPostListQuerySchema, 'query'),
  asyncHandler(blogController.listPublicPosts)
);

router.get(
  '/posts/:slug',
  validate(postSlugParamSchema, 'params'),
  asyncHandler(blogController.getPublicPostBySlug)
);

router.get('/categories', asyncHandler(blogController.listPublicCategories));

router.get(
  '/categories/:slug/posts',
  validate(categorySlugParamSchema, 'params'),
  validate(publicPostListQuerySchema, 'query'),
  asyncHandler(blogController.listPublicPostsByCategorySlug)
);

module.exports = router;
