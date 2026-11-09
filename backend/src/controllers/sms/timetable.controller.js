const timetableService = require('../../services/sms/timetable.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listClassrooms(req, res) {
  const data = await timetableService.listClassrooms(req.validated.query);
  return sendSuccess(res, { message: 'Classrooms retrieved', data });
}

async function createClassroom(req, res) {
  const classroom = await timetableService.createClassroom(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Classroom created', data: { classroom } });
}

async function updateClassroom(req, res) {
  const classroom = await timetableService.updateClassroom(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Classroom updated', data: { classroom } });
}

async function deleteClassroom(req, res) {
  const classroom = await timetableService.softDeleteClassroom(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Classroom deleted', data: { classroom } });
}

async function listTimetables(req, res) {
  const data = await timetableService.listTimetables(req.validated.query);
  return sendSuccess(res, { message: 'Timetables retrieved', data });
}

async function getTimetable(req, res) {
  const timetable = await timetableService.getTimetableById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Timetable retrieved', data: { timetable } });
}

async function createTimetable(req, res) {
  const timetable = await timetableService.createTimetable(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Timetable created', data: { timetable } });
}

async function updateTimetable(req, res) {
  const timetable = await timetableService.updateTimetable(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable updated', data: { timetable } });
}

async function publishTimetable(req, res) {
  const timetable = await timetableService.setTimetablePublication(
    req.validated.params.id,
    true,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable published', data: { timetable } });
}

async function unpublishTimetable(req, res) {
  const timetable = await timetableService.setTimetablePublication(
    req.validated.params.id,
    false,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable unpublished', data: { timetable } });
}

async function deleteTimetable(req, res) {
  const timetable = await timetableService.softDeleteTimetable(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable deleted', data: { timetable } });
}

async function createEntry(req, res) {
  const entry = await timetableService.createEntry(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Timetable entry created', data: { entry } });
}

async function updateEntry(req, res) {
  const entry = await timetableService.updateEntry(
    req.validated.params.entryId,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable entry updated', data: { entry } });
}

async function deleteEntry(req, res) {
  const entry = await timetableService.softDeleteEntry(
    req.validated.params.entryId,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Timetable entry deleted', data: { entry } });
}

async function checkConflicts(req, res) {
  const data = await timetableService.checkConflicts(req.validated.query);
  return sendSuccess(res, { message: 'Conflict check completed', data });
}

module.exports = {
  listClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  listTimetables,
  getTimetable,
  createTimetable,
  updateTimetable,
  publishTimetable,
  unpublishTimetable,
  deleteTimetable,
  createEntry,
  updateEntry,
  deleteEntry,
  checkConflicts,
};
