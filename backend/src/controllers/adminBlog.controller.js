const blogPostService = require('../services/blogPost.service');
const blogCategoryService = require('../services/blogCategory.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listPosts(req, res) {
  const result = await blogPostService.listAdminPosts(req.validated.query);
  return sendSuccess(res, { message: 'Articles retrieved', data: result });
}

async function getPost(req, res) {
  const post = await blogPostService.getAdminPostById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Article retrieved', data: { post } });
}

async function createPost(req, res) {
  const post = await blogPostService.createPost(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Article created',
    data: { post },
  });
}

async function updatePost(req, res) {
  const post = await blogPostService.updatePost(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Article updated', data: { post } });
}

async function publishPost(req, res) {
  const post = await blogPostService.publishPost(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Article published', data: { post } });
}

async function unpublishPost(req, res) {
  const post = await blogPostService.unpublishPost(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Article unpublished', data: { post } });
}

async function deletePost(req, res) {
  const post = await blogPostService.softDeletePost(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Article deleted', data: { post } });
}

async function restorePost(req, res) {
  const post = await blogPostService.restorePost(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Article restored', data: { post } });
}

async function listCategories(req, res) {
  const categories = await blogCategoryService.listAdminCategories(req.validated.query);
  return sendSuccess(res, {
    message: 'Categories retrieved',
    data: { categories },
  });
}

async function createCategory(req, res) {
  const category = await blogCategoryService.createCategory(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Category created',
    data: { category },
  });
}

async function updateCategory(req, res) {
  const category = await blogCategoryService.updateCategory(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    message: 'Category updated',
    data: { category },
  });
}

async function deleteCategory(req, res) {
  const category = await blogCategoryService.softDeleteCategory(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    message: 'Category deleted',
    data: { category },
  });
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  deletePost,
  restorePost,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
