const assignmentService = require('../../services/sms/assignment.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function adminActor(req) {
  return { adminId: req.admin.id };
}

async function listAssignments(req, res) {
  const result = await assignmentService.listAssignments(req.validated.query);
  return sendSuccess(res, { message: 'Assignments retrieved', data: result });
}

async function getAssignment(req, res) {
  const assignment = await assignmentService.getAssignmentById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Assignment retrieved', data: { assignment } });
}

async function createAssignment(req, res) {
  const assignment = await assignmentService.createAssignment(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Assignment created', data: { assignment } });
}

async function updateAssignment(req, res) {
  const assignment = await assignmentService.updateAssignment(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Assignment updated', data: { assignment } });
}

async function deleteAssignment(req, res) {
  const assignment = await assignmentService.softDeleteAssignment(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Assignment deleted', data: { assignment } });
}

async function listSubmissions(req, res) {
  const result = await assignmentService.listSubmissions(req.validated.params.id, req.validated.query);
  return sendSuccess(res, { message: 'Submissions retrieved', data: result });
}

async function gradeSubmission(req, res) {
  const { id, submissionId } = req.validated.params;
  const submission = await assignmentService.gradeSubmission(
    id,
    submissionId,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Submission graded', data: { submission } });
}

module.exports = {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listSubmissions,
  gradeSubmission,
};
