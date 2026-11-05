const blogPostService = require('../services/blogPost.service');
const blogCategoryService = require('../services/blogCategory.service');
const { sendSuccess } = require('../utils/apiResponse');

async function listPublicPosts(req, res) {
  const result = await blogPostService.listPublicPosts(req.validated.query);
  return sendSuccess(res, {
    message: 'Published articles retrieved',
    data: result,
  });
}

async function getPublicPostBySlug(req, res) {
  const post = await blogPostService.getPublicPostBySlug(req.validated.params.slug);
  return sendSuccess(res, {
    message: 'Article retrieved',
    data: { post },
  });
}

async function listPublicCategories(req, res) {
  const categories = await blogCategoryService.listPublicCategories();
  return sendSuccess(res, {
    message: 'Categories retrieved',
    data: { categories },
  });
}

async function listPublicPostsByCategorySlug(req, res) {
  const { slug } = req.validated.params;
  await blogCategoryService.getPublicCategoryBySlug(slug);

  const result = await blogPostService.listPublicPosts({
    ...req.validated.query,
    categorySlug: slug,
  });

  return sendSuccess(res, {
    message: 'Category articles retrieved',
    data: result,
  });
}

module.exports = {
  listPublicPosts,
  getPublicPostBySlug,
  listPublicCategories,
  listPublicPostsByCategorySlug,
};
