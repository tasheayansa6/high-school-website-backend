const gradebookService = require('../../services/sms/gradebook.service');
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

async function listScales(req, res) {
  const data = await gradebookService.listGradingScales(req.validated?.query || {});
  return sendSuccess(res, { message: 'Grading scales retrieved', data });
}

async function getScale(req, res) {
  const gradingScale = await gradebookService.getGradingScaleById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Grading scale retrieved', data: { gradingScale } });
}

async function createScale(req, res) {
  const gradingScale = await gradebookService.createGradingScale(
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Grading scale created', data: { gradingScale } });
}

async function updateScale(req, res) {
  const gradingScale = await gradebookService.updateGradingScale(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Grading scale updated', data: { gradingScale } });
}

async function deleteScale(req, res) {
  const gradingScale = await gradebookService.softDeleteGradingScale(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Grading scale deleted', data: { gradingScale } });
}

async function listCategories(req, res) {
  const data = await gradebookService.listAssessmentCategories(req.validated?.query || {});
  return sendSuccess(res, { message: 'Assessment categories retrieved', data });
}

async function createCategory(req, res) {
  const category = await gradebookService.createAssessmentCategory(
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Assessment category created', data: { category } });
}

async function updateCategory(req, res) {
  const category = await gradebookService.updateAssessmentCategory(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Assessment category updated', data: { category } });
}

async function deleteCategory(req, res) {
  const category = await gradebookService.softDeleteAssessmentCategory(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Assessment category deleted', data: { category } });
}

async function validateWeights(req, res) {
  const data = await gradebookService.validateWeightConfiguration(req.validated.body);
  return sendSuccess(res, { message: 'Weight validation completed', data });
}

async function overview(req, res) {
  const data = await gradebookService.listGradebookOverview(req.validated.query);
  return sendSuccess(res, { message: 'Gradebook overview retrieved', data });
}

async function classSubject(req, res) {
  const data = await gradebookService.buildClassSubjectGradebook(req.validated.query);
  return sendSuccess(res, { message: 'Class subject gradebook retrieved', data });
}

async function pending(req, res) {
  const data = await gradebookService.listPendingSubmissions(req.validated.query);
  return sendSuccess(res, { message: 'Pending gradebook submissions retrieved', data });
}

async function approveExamination(req, res) {
  const examination = await examinationService.publishExamination(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Results approved and published', data: { examination } });
}

async function rejectExamination(req, res) {
  const examination = await examinationService.reopenExaminationMarks(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req),
    req.validated.body || {}
  );
  return sendSuccess(res, { message: 'Submitted results rejected and reopened', data: { examination } });
}

async function reopenExamination(req, res) {
  const examination = await examinationService.reopenExaminationMarks(
    req.validated.params.id,
    adminActor(req),
    getRequestMeta(req),
    req.validated.body || {}
  );
  return sendSuccess(res, { message: 'Examination marks reopened for editing', data: { examination } });
}

module.exports = {
  listScales,
  getScale,
  createScale,
  updateScale,
  deleteScale,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  validateWeights,
  overview,
  classSubject,
  pending,
  approveExamination,
  rejectExamination,
  reopenExamination,
};
