const studentService = require('../../services/sms/student.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listStudents(req, res) {
  const result = await studentService.listStudents(req.validated.query);
  return sendSuccess(res, { message: 'Students retrieved', data: result });
}

async function getStudent(req, res) {
  const student = await studentService.getStudentById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Student retrieved', data: { student } });
}

async function createStudent(req, res) {
  const student = await studentService.createStudent(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Student created',
    data: { student },
  });
}

async function updateStudent(req, res) {
  const student = await studentService.updateStudent(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Student updated',
    data: { student },
  });
}

async function activateStudent(req, res) {
  const student = await studentService.setStudentActive(req.validated.params.id, true, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Student activated',
    data: { student },
  });
}

async function deactivateStudent(req, res) {
  const student = await studentService.setStudentActive(req.validated.params.id, false, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Student deactivated',
    data: { student },
  });
}

async function deleteStudent(req, res) {
  const student = await studentService.softDeleteStudent(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Student deleted',
    data: { student },
  });
}

async function restoreStudent(req, res) {
  const student = await studentService.restoreStudent(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Student restored',
    data: { student },
  });
}

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  activateStudent,
  deactivateStudent,
  deleteStudent,
  restoreStudent,
};
