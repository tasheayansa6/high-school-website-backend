const teacherService = require('../../services/sms/teacher.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listTeachers(req, res) {
  const result = await teacherService.listTeachers(req.validated.query);
  return sendSuccess(res, { message: 'Teachers retrieved', data: result });
}

async function getTeacher(req, res) {
  const teacher = await teacherService.getTeacherById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Teacher retrieved', data: { teacher } });
}

async function createTeacher(req, res) {
  const teacher = await teacherService.createTeacher(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    status: 201,
    message: 'Teacher created',
    data: { teacher },
  });
}

async function updateTeacher(req, res) {
  const teacher = await teacherService.updateTeacher(req.validated.params.id, req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teacher updated',
    data: { teacher },
  });
}

async function activateTeacher(req, res) {
  const teacher = await teacherService.setTeacherActive(req.validated.params.id, true, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teacher activated',
    data: { teacher },
  });
}

async function deactivateTeacher(req, res) {
  const teacher = await teacherService.setTeacherActive(req.validated.params.id, false, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teacher deactivated',
    data: { teacher },
  });
}

async function deleteTeacher(req, res) {
  const teacher = await teacherService.softDeleteTeacher(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teacher deleted',
    data: { teacher },
  });
}

async function restoreTeacher(req, res) {
  const teacher = await teacherService.restoreTeacher(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, {
    message: 'Teacher restored',
    data: { teacher },
  });
}

module.exports = {
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  activateTeacher,
  deactivateTeacher,
  deleteTeacher,
  restoreTeacher,
};
