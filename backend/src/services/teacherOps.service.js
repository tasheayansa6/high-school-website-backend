/**
 * Teacher portal operations (attendance, assignments, grading, exam results).
 *
 * Every read and write is scoped to the authenticated teacher's live
 * TeachingAssignment rows. Writes to a class (or class + subject) the teacher
 * does not teach are rejected with 403; assignments/submissions owned by
 * another teacher are reported as not found.
 */
const { prisma } = require('../config/database');
const attendanceService = require('./sms/attendance.service');
const assignmentService = require('./sms/assignment.service');
const examinationService = require('./sms/examination.service');
const gradebookService = require('./sms/gradebook.service');
const {
  forbidden,
  listTeacherClassIds,
  teacherTeachesClass,
  teacherTeachesClassSubject,
} = require('./sms/ops.helpers');

async function assertTeachesClass(teacherId, classOfferingId) {
  if (!(await teacherTeachesClass(teacherId, classOfferingId))) {
    throw forbidden('You are not assigned to teach this class.');
  }
}

async function assertTeachesClassSubject(teacherId, classOfferingId, subjectId) {
  if (!(await teacherTeachesClassSubject(teacherId, classOfferingId, subjectId))) {
    throw forbidden('You are not assigned to teach this subject in this class.');
  }
}

/** Live (class, subject) pairs the teacher teaches. */
async function listTeacherClassSubjectPairs(teacherId) {
  const rows = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      deletedAt: null,
      classOffering: { deletedAt: null },
      subject: { deletedAt: null },
    },
    select: { classOfferingId: true, subjectId: true },
  });
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.classOfferingId}:${row.subjectId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Load an exam and make sure the teacher teaches its class + subject. */
async function loadScopedExam(teacherId, examId) {
  const exam = await examinationService.getExaminationById(examId);
  await assertTeachesClassSubject(teacherId, exam.classOfferingId, exam.subjectId);
  return exam;
}

// ---- Attendance -----------------------------------------------------------

async function listAttendance(teacherId, query) {
  const classOfferingIds = await listTeacherClassIds(teacherId);
  return attendanceService.listAttendance({ ...query, includeDeleted: false }, { classOfferingIds });
}

async function upsertAttendance(teacherId, payload, requestMeta) {
  await assertTeachesClass(teacherId, payload.classOfferingId);
  return attendanceService.upsertAttendance(payload, { teacherId }, requestMeta);
}

async function bulkUpsertAttendance(teacherId, payload, requestMeta) {
  await assertTeachesClass(teacherId, payload.classOfferingId);
  return attendanceService.bulkUpsertAttendance(payload, { teacherId }, requestMeta);
}

// ---- Assignments ----------------------------------------------------------

async function listAssignments(teacherId, query) {
  return assignmentService.listAssignments({ ...query, includeDeleted: false }, { teacherId });
}

async function getAssignment(teacherId, id) {
  return assignmentService.getAssignmentById(id, {}, { teacherId });
}

async function createAssignment(teacherId, payload, requestMeta) {
  await assertTeachesClassSubject(teacherId, payload.classOfferingId, payload.subjectId);
  return assignmentService.createAssignment({ ...payload, teacherId }, { teacherId }, requestMeta);
}

async function updateAssignment(teacherId, id, payload, requestMeta) {
  return assignmentService.updateAssignment(id, payload, { teacherId }, requestMeta, { teacherId });
}

async function deleteAssignment(teacherId, id, requestMeta) {
  return assignmentService.softDeleteAssignment(id, { teacherId }, requestMeta, { teacherId });
}

async function listSubmissions(teacherId, assignmentId, query) {
  return assignmentService.listSubmissions(assignmentId, query, { teacherId });
}

async function gradeSubmission(teacherId, assignmentId, submissionId, payload, requestMeta) {
  return assignmentService.gradeSubmission(
    assignmentId,
    submissionId,
    payload,
    { teacherId },
    requestMeta,
    { teacherId }
  );
}

// ---- Exams / results ------------------------------------------------------

async function listExaminations(teacherId, query) {
  const classSubjectPairs = await listTeacherClassSubjectPairs(teacherId);
  return examinationService.listExaminations({ ...query, includeDeleted: false }, { classSubjectPairs });
}

async function listExamResults(teacherId, examId, query) {
  await loadScopedExam(teacherId, examId);
  return examinationService.listResults(examId, { ...query, includeDeleted: false });
}

async function upsertExamResults(teacherId, examId, payload, requestMeta) {
  await loadScopedExam(teacherId, examId);
  return examinationService.upsertResults(examId, payload, { teacherId }, requestMeta);
}

async function createExamination(teacherId, payload, requestMeta) {
  await assertTeachesClassSubject(teacherId, payload.classOfferingId, payload.subjectId);
  return examinationService.createExamination(payload, { teacherId }, requestMeta);
}

async function updateExamination(teacherId, examId, payload, requestMeta) {
  await loadScopedExam(teacherId, examId);
  return examinationService.updateExamination(examId, payload, { teacherId }, requestMeta);
}

async function submitExamMarks(teacherId, examId, requestMeta) {
  await loadScopedExam(teacherId, examId);
  return examinationService.submitExaminationMarks(examId, { teacherId }, requestMeta);
}

async function listGradebooks(teacherId, query) {
  return gradebookService.listTeacherGradebooks(teacherId, query);
}

async function getClassSubjectGradebook(teacherId, query) {
  await assertTeachesClassSubject(teacherId, query.classOfferingId, query.subjectId);
  return gradebookService.buildClassSubjectGradebook({
    ...query,
    publishedOnly: false,
  });
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
