const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

/**
 * Thin controller factory for flat catalogs (grade levels, sections, subjects).
 * @param {object} service  Result of createCatalogService()
 * @param {string} label    Singular label, e.g. 'Grade level'
 * @param {string} key      Response key, e.g. 'gradeLevel'
 */
function createCatalogController(service, label, key) {
  async function list(req, res) {
    const result = await service.list(req.validated.query);
    return sendSuccess(res, { message: `${label} list retrieved`, data: result });
  }

  async function get(req, res) {
    const item = await service.getById(req.validated.params.id, {
      includeDeleted: req.validated.query?.includeDeleted === true,
    });
    return sendSuccess(res, { message: `${label} retrieved`, data: { [key]: item } });
  }

  async function create(req, res) {
    const item = await service.create(req.validated.body, req.admin, getRequestMeta(req));
    return sendSuccess(res, {
      status: 201,
      message: `${label} created`,
      data: { [key]: item },
    });
  }

  async function update(req, res) {
    const item = await service.update(
      req.validated.params.id,
      req.validated.body,
      req.admin,
      getRequestMeta(req)
    );
    return sendSuccess(res, { message: `${label} updated`, data: { [key]: item } });
  }

  async function remove(req, res) {
    const item = await service.softDelete(
      req.validated.params.id,
      req.admin,
      getRequestMeta(req)
    );
    return sendSuccess(res, { message: `${label} deleted`, data: { [key]: item } });
  }

  return { list, get, create, update, remove };
}

module.exports = { createCatalogController };
