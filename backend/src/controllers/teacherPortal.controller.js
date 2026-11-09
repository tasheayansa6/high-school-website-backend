const teacherPortalService = require('../services/teacherPortal.service');
const { sendSuccess } = require('../utils/apiResponse');

async function overview(req, res) {
  const data = await teacherPortalService.getOverview(req.teacher.id);
  return sendSuccess(res, { message: 'Teacher dashboard overview retrieved', data });
}

async function profile(req, res) {
  const data = await teacherPortalService.getProfile(req.teacher.id);
  return sendSuccess(res, { message: 'Teacher profile retrieved', data });
}

async function listClasses(req, res) {
  const data = await teacherPortalService.listClasses(req.teacher.id);
  return sendSuccess(res, { message: 'Teacher classes retrieved', data });
}

async function getClass(req, res) {
  const data = await teacherPortalService.getClassById(req.teacher.id, req.validated.params.id);
  return sendSuccess(res, { message: 'Teacher class retrieved', data });
}

async function listSubjects(req, res) {
  const data = await teacherPortalService.listSubjects(req.teacher.id);
  return sendSuccess(res, { message: 'Teacher subjects retrieved', data });
}

async function listStudents(req, res) {
  const data = await teacherPortalService.listStudents(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Teacher students retrieved', data });
}

async function listAnnouncements(req, res) {
  const data = await teacherPortalService.listAnnouncements(req.teacher.id, req.validated.query);
  return sendSuccess(res, { message: 'Teacher announcements retrieved', data });
}

async function listTimetable(req, res) {
  const timetableService = require('../services/sms/timetable.service');
  const data = await timetableService.listEntriesForTeacher(
    req.teacher.id,
    req.validated?.query || {}
  );
  return sendSuccess(res, { message: 'Teacher timetable retrieved', data });
}

module.exports = {
  overview,
  profile,
  listClasses,
  getClass,
  listSubjects,
  listStudents,
  listAnnouncements,
  listTimetable,
};
