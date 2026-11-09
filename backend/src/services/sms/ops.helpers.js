/**
 * Shared helpers for SMS operations services (attendance, assignments,
 * exams, fees, announcements, reports).
 */
const { prisma } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { notFound, validationFailure } = require('./common');

/** Serialize Prisma Decimal (or null/undefined) as a JS number. */
function toNumber(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/** Normalize a Date to UTC midnight (DATE column semantics). */
function toDateOnly(value) {
  if (!value) return value;
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function forbidden(message = 'You do not have access to this resource.') {
  return new AppError(message, 403, { code: 'FORBIDDEN' });
}

/** Spread into recordAudit to attribute the action to the right actor. */
function auditActor(actor = {}) {
  if (actor.adminId) return { adminId: actor.adminId };
  if (actor.teacherId) return { teacherId: actor.teacherId };
  if (actor.studentId) return { studentId: actor.studentId };
  return {};
}

const studentRefSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  studentCode: true,
};

const classRefSelect = {
  id: true,
  name: true,
  academicYearId: true,
  gradeLevelId: true,
  sectionId: true,
};

const subjectRefSelect = { id: true, name: true, code: true };

async function findClassOfferingOrThrow(classOfferingId) {
  const classOffering = await prisma.classOffering.findFirst({
    where: { id: classOfferingId, deletedAt: null },
  });
  if (!classOffering) throw notFound('Class offering', 'CLASS_OFFERING_NOT_FOUND');
  return classOffering;
}

async function findSubjectOrThrow(subjectId) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, deletedAt: null } });
  if (!subject) throw notFound('Subject', 'SUBJECT_NOT_FOUND');
  return subject;
}

async function findStudentOrThrow(studentId) {
  const student = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!student) throw notFound('Student', 'STUDENT_NOT_FOUND');
  return student;
}

/** Ids (from `studentIds`) with a live ACTIVE enrollment in the class offering. */
async function findActivelyEnrolledStudentIds(classOfferingId, studentIds) {
  const rows = await prisma.enrollment.findMany({
    where: {
      classOfferingId,
      studentId: { in: studentIds },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: { studentId: true },
  });
  return new Set(rows.map((row) => row.studentId));
}

async function assertStudentsEnrolled(classOfferingId, studentIds, field = 'studentId') {
  const unique = [...new Set(studentIds)];
  const enrolled = await findActivelyEnrolledStudentIds(classOfferingId, unique);
  const missing = unique.filter((id) => !enrolled.has(id));
  if (missing.length > 0) {
    throw validationFailure(
      `Student(s) ${missing.join(', ')} are not actively enrolled in this class offering`,
      field
    );
  }
}

/** Class offering ids the teacher has a live TeachingAssignment for. */
async function listTeacherClassIds(teacherId) {
  const rows = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      deletedAt: null,
      classOffering: { deletedAt: null },
      subject: { deletedAt: null },
    },
    distinct: ['classOfferingId'],
    select: { classOfferingId: true },
  });
  return rows.map((row) => row.classOfferingId);
}

async function teacherTeachesClass(teacherId, classOfferingId) {
  const row = await prisma.teachingAssignment.findFirst({
    where: { teacherId, classOfferingId, deletedAt: null, subject: { deletedAt: null } },
    select: { id: true },
  });
  return Boolean(row);
}

async function teacherTeachesClassSubject(teacherId, classOfferingId, subjectId) {
  const row = await prisma.teachingAssignment.findFirst({
    where: { teacherId, classOfferingId, subjectId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

module.exports = {
  toNumber,
  toDateOnly,
  forbidden,
  auditActor,
  studentRefSelect,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
  findStudentOrThrow,
  findActivelyEnrolledStudentIds,
  assertStudentsEnrolled,
  listTeacherClassIds,
  teacherTeachesClass,
  teacherTeachesClassSubject,
};
