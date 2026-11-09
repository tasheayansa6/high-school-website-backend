const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { PERMISSIONS } = require('../../config/roles');
const {
  createPostBodySchema,
  updatePostBodySchema,
  adminPostListQuerySchema,
  postIdParamSchema,
  adminPostGetQuerySchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
  adminCategoryListQuerySchema,
  categoryIdParamSchema,
} = require('../../validators/blog.schemas');
const adminBlogController = require('../../controllers/adminBlog.controller');

const router = express.Router();

const canManageBlog = [authenticate, authorize(PERMISSIONS.BLOG_MANAGE)];
const canRestoreBlog = [authenticate, authorize(PERMISSIONS.BLOG_RESTORE)];

router.get(
  '/posts',
  ...canManageBlog,
  validate(adminPostListQuerySchema, 'query'),
  asyncHandler(adminBlogController.listPosts)
);

router.post(
  '/posts',
  ...canManageBlog,
  validate(createPostBodySchema, 'body'),
  asyncHandler(adminBlogController.createPost)
);

router.get(
  '/posts/:id',
  ...canManageBlog,
  validate(postIdParamSchema, 'params'),
  validate(adminPostGetQuerySchema, 'query'),
  asyncHandler(adminBlogController.getPost)
);

router.patch(
  '/posts/:id',
  ...canManageBlog,
  validate(postIdParamSchema, 'params'),
  validate(updatePostBodySchema, 'body'),
  asyncHandler(adminBlogController.updatePost)
);

router.patch(
  '/posts/:id/publish',
  ...canManageBlog,
  validate(postIdParamSchema, 'params'),
  asyncHandler(adminBlogController.publishPost)
);

router.patch(
  '/posts/:id/unpublish',
  ...canManageBlog,
  validate(postIdParamSchema, 'params'),
  asyncHandler(adminBlogController.unpublishPost)
);

router.delete(
  '/posts/:id',
  ...canManageBlog,
  validate(postIdParamSchema, 'params'),
  asyncHandler(adminBlogController.deletePost)
);

router.patch(
  '/posts/:id/restore',
  ...canRestoreBlog,
  validate(postIdParamSchema, 'params'),
  asyncHandler(adminBlogController.restorePost)
);

router.get(
  '/categories',
  ...canManageBlog,
  validate(adminCategoryListQuerySchema, 'query'),
  asyncHandler(adminBlogController.listCategories)
);

router.post(
  '/categories',
  ...canManageBlog,
  validate(createCategoryBodySchema, 'body'),
  asyncHandler(adminBlogController.createCategory)
);

router.patch(
  '/categories/:id',
  ...canManageBlog,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategoryBodySchema, 'body'),
  asyncHandler(adminBlogController.updateCategory)
);

router.delete(
  '/categories/:id',
  ...canManageBlog,
  validate(categoryIdParamSchema, 'params'),
  asyncHandler(adminBlogController.deleteCategory)
);

module.exports = router;
