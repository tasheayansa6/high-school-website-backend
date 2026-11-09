const academicYearService = require('../../services/sms/academicYear.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listAcademicYears(req, res) {
  const result = await academicYearService.listAcademicYears(req.validated.query);
  return sendSuccess(res, { message: 'Academic years retrieved', data: result });
}

async function getAcademicYear(req, res) {
  const academicYear = await academicYearService.getAcademicYearById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Academic year retrieved', data: { academicYear } });
}

async function listTerms(req, res) {
  const result = await academicYearService.listTerms(req.validated.params.id);
  return sendSuccess(res, { message: 'Academic terms retrieved', data: result });
}

async function createAcademicYear(req, res) {
  const academicYear = await academicYearService.createAcademicYear(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Academic year created',
    data: { academicYear },
  });
}

async function updateAcademicYear(req, res) {
  const academicYear = await academicYearService.updateAcademicYear(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Academic year updated',
    data: { academicYear },
  });
}

async function setCurrentAcademicYear(req, res) {
  const academicYear = await academicYearService.setCurrentAcademicYear(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Academic year set as current',
    data: { academicYear },
  });
}

async function deleteAcademicYear(req, res) {
  const academicYear = await academicYearService.softDeleteAcademicYear(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Academic year deleted',
    data: { academicYear },
  });
}

async function createTerm(req, res) {
  const academicTerm = await academicYearService.createTerm(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Academic term created',
    data: { academicTerm },
  });
}

async function updateTerm(req, res) {
  const academicTerm = await academicYearService.updateTerm(req.validated.params.id, req.validated.params.termId, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Academic term updated',
    data: { academicTerm },
  });
}

module.exports = {
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYear,
  listTerms,
  createTerm,
  updateTerm,
};
