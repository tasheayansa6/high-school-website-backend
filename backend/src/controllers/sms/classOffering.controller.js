const classOfferingService = require('../../services/sms/classOffering.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listClassOfferings(req, res) {
  const result = await classOfferingService.listClassOfferings(req.validated.query);
  return sendSuccess(res, { message: 'Class offerings retrieved', data: result });
}

async function getClassOffering(req, res) {
  const classOffering = await classOfferingService.getClassOfferingById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Class offering retrieved', data: { classOffering } });
}

async function createClassOffering(req, res) {
  const classOffering = await classOfferingService.createClassOffering(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Class offering created',
    data: { classOffering },
  });
}

async function updateClassOffering(req, res) {
  const classOffering = await classOfferingService.updateClassOffering(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Class offering updated',
    data: { classOffering },
  });
}

async function deleteClassOffering(req, res) {
  const classOffering = await classOfferingService.softDeleteClassOffering(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Class offering deleted',
    data: { classOffering },
  });
}

module.exports = {
  listClassOfferings,
  getClassOffering,
  createClassOffering,
  updateClassOffering,
  deleteClassOffering,
};
