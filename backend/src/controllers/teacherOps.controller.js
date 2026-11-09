const teacherOpsService = require('../services/teacherOps.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listAttendance(req, res) {
  const data = await teacherOpsService.listAttendance(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Attendance records retrieved', data });
}

async function upsertAttendance(req, res) {
  const attendance = await teacherOpsService.upsertAttendance(req.teacher.id, req.validated.body, getRequestMeta(req));
  return sendSuccess(res, { message: 'Attendance saved', data: { attendance } });
}

async function bulkUpsertAttendance(req, res) {
  const data = await teacherOpsService.bulkUpsertAttendance(req.teacher.id, req.validated.body, getRequestMeta(req));
  return sendSuccess(res, { message: 'Class attendance saved', data });
}

async function listAssignments(req, res) {
  const data = await teacherOpsService.listAssignments(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Assignments retrieved', data });
}

async function getAssignment(req, res) {
  const assignment = await teacherOpsService.getAssignment(req.teacher.id, req.validated.params.id);
  return sendSuccess(res, { message: 'Assignment retrieved', data: { assignment } });
}

async function createAssignment(req, res) {
  const assignment = await teacherOpsService.createAssignment(req.teacher.id, req.validated.body, getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Assignment created', data: { assignment } });
}

async function updateAssignment(req, res) {
  const assignment = await teacherOpsService.updateAssignment(
    req.teacher.id,
    req.validated.params.id,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Assignment updated', data: { assignment } });
}

async function deleteAssignment(req, res) {
  const assignment = await teacherOpsService.deleteAssignment(req.teacher.id, req.validated.params.id, getRequestMeta(req));
  return sendSuccess(res, { message: 'Assignment deleted', data: { assignment } });
}

async function listSubmissions(req, res) {
  const data = await teacherOpsService.listSubmissions(req.teacher.id, req.validated.params.id, req.validated.query);
  return sendSuccess(res, { message: 'Submissions retrieved', data });
}

async function gradeSubmission(req, res) {
  const { id, submissionId } = req.validated.params;
  const submission = await teacherOpsService.gradeSubmission(
    req.teacher.id,
    id,
    submissionId,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Submission graded', data: { submission } });
}

async function listExaminations(req, res) {
  const data = await teacherOpsService.listExaminations(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Examinations retrieved', data });
}

async function listExamResults(req, res) {
  const data = await teacherOpsService.listExamResults(req.teacher.id, req.validated.params.id, req.validated.query);
  return sendSuccess(res, { message: 'Exam results retrieved', data });
}

async function upsertExamResults(req, res) {
  const data = await teacherOpsService.upsertExamResults(
    req.teacher.id,
    req.validated.params.id,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Exam results saved', data });
}

async function createExamination(req, res) {
  const examination = await teacherOpsService.createExamination(
    req.teacher.id,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Examination created', data: { examination } });
}

async function updateExamination(req, res) {
  const examination = await teacherOpsService.updateExamination(
    req.teacher.id,
    req.validated.params.id,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Examination updated', data: { examination } });
}

async function submitExamMarks(req, res) {
  const examination = await teacherOpsService.submitExamMarks(
    req.teacher.id,
    req.validated.params.id,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Marks submitted for review', data: { examination } });
}

async function listGradebooks(req, res) {
  const data = await teacherOpsService.listGradebooks(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Teacher gradebooks retrieved', data });
}

async function getClassSubjectGradebook(req, res) {
  const data = await teacherOpsService.getClassSubjectGradebook(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Class subject gradebook retrieved', data });
}

module.exports = {
  listAttendance,
  upsertAttendance,
  bulkUpsertAttendance,
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listSubmissions,
  gradeSubmission,
  listExaminations,
  listExamResults,
  upsertExamResults,
  createExamination,
  updateExamination,
  submitExamMarks,
  listGradebooks,
  getClassSubjectGradebook,
};
