/**
 * Student portal read services.
 *
 * Every query is scoped to the authenticated student's id through live
 * Enrollment rows (status ACTIVE, enrollment / class offering / student not
 * soft-deleted). Subjects come from live TeachingAssignments on those class
 * offerings. Only public teacher fields are exposed; passwordHash and other
 * private fields are never selected. Attendance, assignments, published exam results,
 * fees and announcements are scoped to the student's own id / enrollments.
 */
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const { toPublicStudent } = require('../utils/smsSerializers');
const attendanceService = require('./sms/attendance.service');
const assignmentService = require('./sms/assignment.service');
const examinationService = require('./sms/examination.service');
const gradebookService = require('./sms/gradebook.service');
const feeService = require('./sms/fee.service');
const announcementService = require('./sms/announcement.service');

const classSelect = {
  id: true,
  name: true,
  academicYear: { select: { id: true, name: true, code: true, isCurrent: true } },
  gradeLevel: { select: { id: true, name: true, code: true, sortOrder: true } },
  section: { select: { id: true, name: true, code: true } },
  homeroomTeacher: { select: { id: true, firstName: true, lastName: true, email: true, deletedAt: true } },
};

const subjectSelect = { id: true, name: true, code: true, description: true };

const publicTeacherSelect = { id: true, firstName: true, lastName: true, email: true };

function toPublicTeacherFields(teacher) {
  if (!teacher || teacher.deletedAt) return null;
  return {
    id: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
  };
}

function toClassSummary(offering) {
  return {
    id: offering.id,
    name: offering.name,
    academicYear: offering.academicYear,
    gradeLevel: offering.gradeLevel,
    section: offering.section,
  };
}

function compareClasses(a, b) {
  return (
    (b.academicYear?.id ?? 0) - (a.academicYear?.id ?? 0) ||
    (a.gradeLevel?.sortOrder ?? 0) - (b.gradeLevel?.sortOrder ?? 0) ||
    String(a.section?.name ?? '').localeCompare(String(b.section?.name ?? ''))
  );
}

async function loadStudent(studentId) {
  const student = await prisma.student.findFirst({ where: notDeleted({ id: studentId }) });
  if (!student || !student.isActive) {
    throw new AppError('Authentication required.', 401, { code: 'UNAUTHORIZED' });
  }
  return student;
}

/** ACTIVE, non-deleted enrollments of this student on live class offerings. */
async function loadActiveEnrollments(studentId) {
  const rows = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      deletedAt: null,
      classOffering: { deletedAt: null },
    },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      classOffering: { select: classSelect },
    },
  });

  return rows.sort((a, b) => compareClasses(a.classOffering, b.classOffering));
}

async function loadAssignments(classOfferingIds) {
  if (classOfferingIds.length === 0) return [];
  return prisma.teachingAssignment.findMany({
    where: {
      classOfferingId: { in: classOfferingIds },
      deletedAt: null,
      subject: { deletedAt: null },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      isPrimary: true,
      classOfferingId: true,
      subjectId: true,
      academicTerm: { select: { id: true, name: true } },
      subject: { select: subjectSelect },
      teacher: { select: { ...publicTeacherSelect, deletedAt: true } },
    },
  });
}

function toEnrollmentItem(row) {
  return {
    id: row.id,
    status: row.status,
    enrolledAt: row.enrolledAt,
    classOffering: {
      ...toClassSummary(row.classOffering),
      homeroomTeacher: toPublicTeacherFields(row.classOffering.homeroomTeacher),
    },
  };
}

function buildSubjects(assignments, classById) {
  const bySubject = new Map();

  for (const row of assignments) {
    if (!bySubject.has(row.subjectId)) {
      bySubject.set(row.subjectId, { ...row.subject, teachers: [] });
    }
    const classOffering = classById.get(row.classOfferingId);
    bySubject.get(row.subjectId).teachers.push({
      assignmentId: row.id,
      isPrimary: row.isPrimary,
      academicTerm: row.academicTerm,
      classOffering: classOffering
        ? { id: classOffering.id, name: classOffering.name }
        : { id: row.classOfferingId },
      teacher: toPublicTeacherFields(row.teacher),
    });
  }

  return [...bySubject.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function loadAcademicContext(studentId) {
  const enrollments = await loadActiveEnrollments(studentId);
  const classOfferingIds = enrollments.map((row) => row.classOffering.id);
  const assignments = await loadAssignments(classOfferingIds);
  const classById = new Map(enrollments.map((row) => [row.classOffering.id, row.classOffering]));
  const subjects = buildSubjects(assignments, classById);

  const teacherIds = new Set(
    assignments.filter((row) => toPublicTeacherFields(row.teacher)).map((row) => row.teacher.id)
  );

  return {
    enrollments: enrollments.map(toEnrollmentItem),
    subjects,
    counts: {
      activeEnrollments: enrollments.length,
      classOfferings: classOfferingIds.length,
      subjects: subjects.length,
      teachers: teacherIds.size,
    },
  };
}

async function getOverview(studentId) {
  const [student, context] = await Promise.all([loadStudent(studentId), loadAcademicContext(studentId)]);

  return {
    student: toPublicStudent(student),
    counts: context.counts,
    enrollments: context.enrollments,
    subjects: context.subjects,
  };
}

async function getProfile(studentId) {
  const [student, context] = await Promise.all([loadStudent(studentId), loadAcademicContext(studentId)]);

  return {
    student: toPublicStudent(student),
    summary: context.counts,
    enrollments: context.enrollments,
  };
}

async function getEnrollment(studentId) {
  await loadStudent(studentId);
  const enrollments = await loadActiveEnrollments(studentId);
  const items = enrollments.map(toEnrollmentItem);
  return { items, total: items.length, current: items[0] ?? null };
}

async function listClasses(studentId) {
  await loadStudent(studentId);
  const enrollments = await loadActiveEnrollments(studentId);
  const assignments = await loadAssignments(enrollments.map((row) => row.classOffering.id));

  const subjectCountByClass = new Map();
  for (const row of assignments) {
    if (!subjectCountByClass.has(row.classOfferingId)) {
      subjectCountByClass.set(row.classOfferingId, new Set());
    }
    subjectCountByClass.get(row.classOfferingId).add(row.subjectId);
  }

  const items = enrollments.map((row) => ({
    ...toClassSummary(row.classOffering),
    homeroomTeacher: toPublicTeacherFields(row.classOffering.homeroomTeacher),
    enrollmentId: row.id,
    enrolledAt: row.enrolledAt,
    subjectCount: subjectCountByClass.get(row.classOffering.id)?.size ?? 0,
  }));

  return { items, total: items.length };
}

async function listSubjects(studentId) {
  await loadStudent(studentId);
  const { subjects } = await loadAcademicContext(studentId);
  return { items: subjects, total: subjects.length };
}

/** Own attendance only (studentId always comes from the token). */
async function listAttendance(studentId, query) {
  await loadStudent(studentId);
  return attendanceService.listAttendance({ ...query, studentId, includeDeleted: false });
}

async function listAssignments(studentId, query) {
  await loadStudent(studentId);
  return assignmentService.listAssignmentsForStudent(studentId, query);
}

async function submitAssignment(studentId, assignmentId, payload, requestMeta) {
  await loadStudent(studentId);
  return assignmentService.submitAssignment(assignmentId, studentId, payload, requestMeta);
}

async function listExamResults(studentId, query) {
  await loadStudent(studentId);
  return examinationService.listPublishedResultsForStudent(studentId, query);
}

async function getGradebookSummary(studentId, query) {
  await loadStudent(studentId);
  return gradebookService.getStudentPublishedSummary(studentId, query);
}

async function listFees(studentId, query) {
  await loadStudent(studentId);
  return feeService.listStudentFeesForStudent(studentId, query);
}

async function listAnnouncements(studentId, query) {
  await loadStudent(studentId);
  return announcementService.listAnnouncementsForStudent(studentId, query);
}

module.exports = {
  getOverview,
  getProfile,
  getEnrollment,
  listClasses,
  listSubjects,
  listAttendance,
  listAssignments,
  submitAssignment,
  listExamResults,
  getGradebookSummary,
  listFees,
  listAnnouncements,
};
