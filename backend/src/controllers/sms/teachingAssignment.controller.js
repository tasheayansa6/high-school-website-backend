const teachingAssignmentService = require('../../services/sms/teachingAssignment.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listTeachingAssignments(req, res) {
  const result = await teachingAssignmentService.listTeachingAssignments(req.validated.query);
  return sendSuccess(res, { message: 'Teaching assignments retrieved', data: result });
}

async function getTeachingAssignment(req, res) {
  const teachingAssignment = await teachingAssignmentService.getTeachingAssignmentById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, {
    message: 'Teaching assignment retrieved',
    data: { teachingAssignment },
  });
}

async function createTeachingAssignment(req, res) {
  const teachingAssignment = await teachingAssignmentService.createTeachingAssignment(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Teaching assignment created',
    data: { teachingAssignment },
  });
}

async function deleteTeachingAssignment(req, res) {
  const teachingAssignment = await teachingAssignmentService.softDeleteTeachingAssignment(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teaching assignment deleted',
    data: { teachingAssignment },
  });
}

module.exports = {
  listTeachingAssignments,
  getTeachingAssignment,
  createTeachingAssignment,
  deleteTeachingAssignment,
};
