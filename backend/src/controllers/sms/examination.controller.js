const examinationService = require('../../services/sms/examination.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function adminActor(req) {
  return { adminId: req.admin.id };
}

async function listExaminations(req, res) {
  const result = await examinationService.listExaminations(req.validated.query);
  return sendSuccess(res, { message: 'Examinations retrieved', data: result });
}

async function getExamination(req, res) {
  const examination = await examinationService.getExaminationById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Examination retrieved', data: { examination } });
}

async function createExamination(req, res) {
  const examination = await examinationService.createExamination(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Examination created', data: { examination } });
}

async function updateExamination(req, res) {
  const examination = await examinationService.updateExamination(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Examination updated', data: { examination } });
}

async function publishExamination(req, res) {
  const examination = await examinationService.publishExamination(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Examination published', data: { examination } });
}

async function unpublishExamination(req, res) {
  const examination = await examinationService.unpublishExamination(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Examination unpublished', data: { examination } });
}

async function reopenExamination(req, res) {
  const examination = await examinationService.reopenExaminationMarks(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req),
    req.validated.body || {}
  );
  return sendSuccess(res, { message: 'Examination marks reopened', data: { examination } });
}

async function deleteExamination(req, res) {
  const examination = await examinationService.softDeleteExamination(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Examination deleted', data: { examination } });
}

async function listResults(req, res) {
  const result = await examinationService.listResults(req.validated.params.id, req.validated.query);
  return sendSuccess(res, { message: 'Exam results retrieved', data: result });
}

async function upsertResults(req, res) {
  const result = await examinationService.upsertResults(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Exam results saved', data: result });
}

async function deleteResult(req, res) {
  const { id, resultId } = req.validated.params;
  const result = await examinationService.softDeleteResult(id, resultId, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Exam result deleted', data: { result } });
}

module.exports = {
  listExaminations,
  getExamination,
  createExamination,
  updateExamination,
  publishExamination,
  unpublishExamination,
  reopenExamination,
  deleteExamination,
  listResults,
  upsertResults,
  deleteResult,
};
