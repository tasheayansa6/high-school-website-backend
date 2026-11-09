const pageService = require('../services/page.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listPages(req, res) {
  const result = await pageService.listAdminPages(req.validated.query);

  return sendSuccess(res, {
    message: 'Pages retrieved',
    data: result,
  });
}

async function searchPages(req, res) {
  const result = await pageService.searchAdminPages(req.validated.query);

  return sendSuccess(res, {
    message: 'Page search results retrieved',
    data: result,
  });
}

async function getPage(req, res) {
  const { id } = req.validated.params;
  const includeDeleted = req.validated.query?.includeDeleted === true;
  const page = await pageService.getAdminPageById(id, { includeDeleted });

  return sendSuccess(res, {
    message: 'Page retrieved',
    data: { page },
  });
}

async function createPage(req, res) {
  const page = await pageService.createPage(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    status: 201,
    message: 'Page created',
    data: { page },
  });
}

async function updatePage(req, res) {
  const { id } = req.validated.params;
  const page = await pageService.updatePage(
    id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Page updated',
    data: { page },
  });
}

async function publishPage(req, res) {
  const { id } = req.validated.params;
  const page = await pageService.publishPage(id, req.admin, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Page published',
    data: { page },
  });
}

async function unpublishPage(req, res) {
  const { id } = req.validated.params;
  const page = await pageService.unpublishPage(id, req.admin, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Page unpublished',
    data: { page },
  });
}

async function deletePage(req, res) {
  const { id } = req.validated.params;
  const page = await pageService.softDeletePage(id, req.admin, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Page deleted',
    data: { page },
  });
}

async function restorePage(req, res) {
  const { id } = req.validated.params;
  const page = await pageService.restorePage(id, req.admin, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Page restored',
    data: { page },
  });
}

module.exports = {
  listPages,
  searchPages,
  getPage,
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  deletePage,
  restorePage,
};
