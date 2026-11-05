const pageService = require('../services/page.service');
const { sendSuccess } = require('../utils/apiResponse');

async function listPublicPages(req, res) {
  const query = req.validated.query;
  const result = await pageService.listPublicPages(query);

  return sendSuccess(res, {
    message: 'Published pages retrieved',
    data: result,
  });
}

async function getPublicPageBySlug(req, res) {
  const { slug } = req.validated.params;
  const page = await pageService.getPublicPageBySlug(slug);

  return sendSuccess(res, {
    message: 'Page retrieved',
    data: { page },
  });
}

module.exports = {
  listPublicPages,
  getPublicPageBySlug,
};
