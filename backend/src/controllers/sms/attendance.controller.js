const attendanceService = require('../../services/sms/attendance.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function adminActor(req) {
  return { adminId: req.admin.id };
}

async function listAttendance(req, res) {
  const result = await attendanceService.listAttendance(req.validated.query);
  return sendSuccess(res, { message: 'Attendance records retrieved', data: result });
}

async function getAttendance(req, res) {
  const attendance = await attendanceService.getAttendanceById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Attendance record retrieved', data: { attendance } });
}

async function upsertAttendance(req, res) {
  const attendance = await attendanceService.upsertAttendance(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Attendance saved', data: { attendance } });
}

async function bulkUpsertAttendance(req, res) {
  const result = await attendanceService.bulkUpsertAttendance(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Class attendance saved', data: result });
}

async function deleteAttendance(req, res) {
  const attendance = await attendanceService.softDeleteAttendance(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Attendance record deleted', data: { attendance } });
}

module.exports = {
  listAttendance,
  getAttendance,
  upsertAttendance,
  bulkUpsertAttendance,
  deleteAttendance,
};
