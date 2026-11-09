const enrollmentService = require('../../services/sms/enrollment.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listEnrollments(req, res) {
  const result = await enrollmentService.listEnrollments(req.validated.query);
  return sendSuccess(res, { message: 'Enrollments retrieved', data: result });
}

async function getEnrollment(req, res) {
  const enrollment = await enrollmentService.getEnrollmentById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Enrollment retrieved', data: { enrollment } });
}

async function createEnrollment(req, res) {
  const enrollment = await enrollmentService.createEnrollment(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Enrollment created',
    data: { enrollment },
  });
}

async function updateEnrollmentStatus(req, res) {
  const enrollment = await enrollmentService.updateEnrollmentStatus(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Enrollment status updated',
    data: { enrollment },
  });
}

async function deleteEnrollment(req, res) {
  const enrollment = await enrollmentService.softDeleteEnrollment(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Enrollment deleted',
    data: { enrollment },
  });
}

module.exports = {
  listEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
};
