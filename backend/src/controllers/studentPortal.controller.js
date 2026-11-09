const studentPortalService = require('../services/studentPortal.service');
const { sendSuccess } = require('../utils/apiResponse');

async function overview(req, res) {
  const data = await studentPortalService.getOverview(req.student.id);
  return sendSuccess(res, { message: 'Student dashboard overview retrieved', data });
}

async function profile(req, res) {
  const data = await studentPortalService.getProfile(req.student.id);
  return sendSuccess(res, { message: 'Student profile retrieved', data });
}

async function enrollment(req, res) {
  const data = await studentPortalService.getEnrollment(req.student.id);
  return sendSuccess(res, { message: 'Student enrollment retrieved', data });
}

async function listClasses(req, res) {
  const data = await studentPortalService.listClasses(req.student.id);
  return sendSuccess(res, { message: 'Student classes retrieved', data });
}

async function listSubjects(req, res) {
  const data = await studentPortalService.listSubjects(req.student.id);
  return sendSuccess(res, { message: 'Student subjects retrieved', data });
}

async function listAttendance(req, res) {
  const data = await studentPortalService.listAttendance(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student attendance retrieved', data });
}

async function listAssignments(req, res) {
  const data = await studentPortalService.listAssignments(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student assignments retrieved', data });
}

async function submitAssignment(req, res) {
  const submission = await studentPortalService.submitAssignment(
    req.student.id,
    req.validated.params.id,
    req.validated.body,
    { ipAddress: req.ip || req.socket?.remoteAddress || null }
  );
  return sendSuccess(res, { status: 201, message: 'Assignment submitted', data: { submission } });
}

async function listExamResults(req, res) {
  const data = await studentPortalService.listExamResults(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student exam results retrieved', data });
}

async function getGradebookSummary(req, res) {
  const data = await studentPortalService.getGradebookSummary(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student gradebook summary retrieved', data });
}

async function listFees(req, res) {
  const data = await studentPortalService.listFees(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student fees retrieved', data });
}

async function listAnnouncements(req, res) {
  const data = await studentPortalService.listAnnouncements(req.student.id, req.validated.query);
  return sendSuccess(res, { message: 'Student announcements retrieved', data });
}

async function listTimetable(req, res) {
  const timetableService = require('../services/sms/timetable.service');
  const data = await timetableService.listTimetablesForStudent(req.student.id);
  return sendSuccess(res, { message: 'Student timetable retrieved', data });
}

module.exports = {
  overview,
  profile,
  enrollment,
  listClasses,
  listSubjects,
  listAttendance,
  listAssignments,
  submitAssignment,
  listExamResults,
  getGradebookSummary,
  listFees,
  listAnnouncements,
  listTimetable,
};
