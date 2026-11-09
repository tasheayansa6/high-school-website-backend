/**
 * Teacher portal read services.
 *
 * Every query is scoped to the authenticated teacher through live
 * TeachingAssignment rows (assignment, class offering and subject not
 * soft-deleted). Students are visible only through ACTIVE, non-deleted
 * enrollments in those classes. passwordHash and other private fields are
 * never selected.
 */
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const { toPublicTeacher } = require('../utils/smsSerializers');
const { buildPagination } = require('./sms/common');
const announcementService = require('./sms/announcement.service');

const CLASS_NOT_FOUND = 'CLASS_OFFERING_NOT_FOUND';
const RECENT_ASSIGNMENT_LIMIT = 8;

const classSelect = {
  id: true,
  name: true,
  academicYear: { select: { id: true, name: true, code: true, isCurrent: true } },
  gradeLevel: { select: { id: true, name: true, code: true, sortOrder: true } },
  section: { select: { id: true, name: true, code: true } },
};

const subjectSelect = { id: true, name: true, code: true, description: true };

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  studentCode: true,
  email: true,
  isActive: true,
};

function liveAssignmentWhere(teacherId, extra = {}) {
  return {
    teacherId,
    deletedAt: null,
    classOffering: { deletedAt: null },
    subject: { deletedAt: null },
    ...extra,
  };
}

function activeEnrollmentWhere(classOfferingIds) {
  return {
    status: 'ACTIVE',
    deletedAt: null,
    classOfferingId: Array.isArray(classOfferingIds)
      ? { in: classOfferingIds }
      : classOfferingIds,
    student: { deletedAt: null },
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

async function loadAssignments(teacherId) {
  return prisma.teachingAssignment.findMany({
    where: liveAssignmentWhere(teacherId),
    orderBy: { id: 'desc' },
    select: {
      id: true,
      isPrimary: true,
      createdAt: true,
      classOfferingId: true,
      subjectId: true,
      academicTerm: { select: { id: true, name: true } },
      classOffering: { select: classSelect },
      subject: { select: subjectSelect },
    },
  });
}

function distinctClassIds(assignments) {
  return [...new Set(assignments.map((row) => row.classOfferingId))];
}

async function countActiveStudents(classOfferingIds) {
  if (classOfferingIds.length === 0) return 0;
  const rows = await prisma.enrollment.findMany({
    where: activeEnrollmentWhere(classOfferingIds),
    distinct: ['studentId'],
    select: { studentId: true },
  });
  return rows.length;
}

async function getSummaryCounts(teacherId, assignments) {
  const classOfferingIds = distinctClassIds(assignments);
  return {
    classOfferings: classOfferingIds.length,
    subjects: new Set(assignments.map((row) => row.subjectId)).size,
    students: await countActiveStudents(classOfferingIds),
    teachingAssignments: assignments.length,
  };
}

async function getOverview(teacherId) {
  const [teacher, assignments] = await Promise.all([
    prisma.teacher.findFirst({ where: notDeleted({ id: teacherId }) }),
    loadAssignments(teacherId),
  ]);

  if (!teacher || !teacher.isActive) {
    throw new AppError('Authentication required.', 401, { code: 'UNAUTHORIZED' });
  }

  return {
    teacher: toPublicTeacher(teacher),
    counts: await getSummaryCounts(teacherId, assignments),
    recentAssignments: assignments.slice(0, RECENT_ASSIGNMENT_LIMIT).map((row) => ({
      id: row.id,
      isPrimary: row.isPrimary,
      academicTerm: row.academicTerm,
      createdAt: row.createdAt,
      classOffering: toClassSummary(row.classOffering),
      subject: row.subject,
    })),
  };
}

async function getProfile(teacherId) {
  const [teacher, assignments] = await Promise.all([
    prisma.teacher.findFirst({ where: notDeleted({ id: teacherId }) }),
    loadAssignments(teacherId),
  ]);

  if (!teacher || !teacher.isActive) {
    throw new AppError('Authentication required.', 401, { code: 'UNAUTHORIZED' });
  }

  return {
    teacher: toPublicTeacher(teacher),
    summary: await getSummaryCounts(teacherId, assignments),
  };
}

async function listClasses(teacherId) {
  const assignments = await loadAssignments(teacherId);
  const classIds = distinctClassIds(assignments);

  const counts =
    classIds.length === 0
      ? []
      : await prisma.enrollment.groupBy({
          by: ['classOfferingId'],
          where: activeEnrollmentWhere(classIds),
          _count: { _all: true },
        });
  const countByClass = new Map(counts.map((row) => [row.classOfferingId, row._count._all]));

  const byClass = new Map();
  for (const row of assignments) {
    if (!byClass.has(row.classOfferingId)) {
      byClass.set(row.classOfferingId, {
        ...toClassSummary(row.classOffering),
        enrollmentCount: countByClass.get(row.classOfferingId) || 0,
        subjects: [],
      });
    }
    const entry = byClass.get(row.classOfferingId);
    if (!entry.subjects.some((subject) => subject.id === row.subject.id)) {
      entry.subjects.push(row.subject);
    }
  }

  const items = [...byClass.values()].sort(compareClasses);
  return { items, total: items.length };
}

/**
 * Unassigned and non-existent classes are indistinguishable (404) so teachers
 * cannot enumerate class offerings they do not teach.
 */
async function assertTeacherAssignedToClass(teacherId, classOfferingId) {
  const assignment = await prisma.teachingAssignment.findFirst({
    where: liveAssignmentWhere(teacherId, { classOfferingId }),
    select: { id: true },
  });

  if (!assignment) {
    throw new AppError('Class not found.', 404, { code: CLASS_NOT_FOUND });
  }
}

async function getClassById(teacherId, classOfferingId) {
  await assertTeacherAssignedToClass(teacherId, classOfferingId);

  const [offering, assignments, enrollments] = await Promise.all([
    prisma.classOffering.findFirst({
      where: { id: classOfferingId, deletedAt: null },
      select: {
        ...classSelect,
        homeroomTeacher: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    }),
    prisma.teachingAssignment.findMany({
      where: liveAssignmentWhere(teacherId, { classOfferingId }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        isPrimary: true,
        academicTerm: { select: { id: true, name: true } },
        subject: { select: subjectSelect },
      },
    }),
    prisma.enrollment.findMany({
      where: activeEnrollmentWhere(classOfferingId),
      select: { id: true, enrolledAt: true, student: { select: studentSelect } },
    }),
  ]);

  if (!offering) {
    throw new AppError('Class not found.', 404, { code: CLASS_NOT_FOUND });
  }

  const students = enrollments
    .map((row) => ({ ...row.student, enrollmentId: row.id, enrolledAt: row.enrolledAt }))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
    );

  return {
    classOffering: {
      ...toClassSummary(offering),
      homeroomTeacher: offering.homeroomTeacher,
      enrollmentCount: students.length,
    },
    subjects: assignments.map((row) => ({
      assignmentId: row.id,
      isPrimary: row.isPrimary,
      academicTerm: row.academicTerm,
      ...row.subject,
    })),
    students,
  };
}

async function listSubjects(teacherId) {
  const assignments = await loadAssignments(teacherId);
  const bySubject = new Map();

  for (const row of assignments) {
    if (!bySubject.has(row.subjectId)) {
      bySubject.set(row.subjectId, { ...row.subject, classOfferings: [] });
    }
    const entry = bySubject.get(row.subjectId);
    if (!entry.classOfferings.some((item) => item.id === row.classOfferingId)) {
      entry.classOfferings.push(toClassSummary(row.classOffering));
    }
  }

  const items = [...bySubject.values()]
    .map((entry) => ({ ...entry, classOfferings: entry.classOfferings.sort(compareClasses) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { items, total: items.length };
}

async function listStudents(teacherId, { page = 1, limit = 20, q, classOfferingId } = {}) {
  let classIds;

  if (classOfferingId) {
    await assertTeacherAssignedToClass(teacherId, classOfferingId);
    classIds = [classOfferingId];
  } else {
    classIds = distinctClassIds(await loadAssignments(teacherId));
  }

  if (classIds.length === 0) {
    return { items: [], pagination: buildPagination({ page, limit, total: 0 }) };
  }

  const enrollmentWhere = activeEnrollmentWhere(classIds);
  const where = {
    deletedAt: null,
    enrollments: { some: enrollmentWhere },
  };

  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { studentCode: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        ...studentSelect,
        enrollments: {
          where: enrollmentWhere,
          select: { classOffering: { select: classSelect } },
        },
      },
    }),
  ]);

  return {
    items: students.map(({ enrollments, ...student }) => ({
      ...student,
      classOfferings: enrollments.map((row) => toClassSummary(row.classOffering)).sort(compareClasses),
    })),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function listAnnouncements(teacherId, query) {
  return announcementService.listAnnouncementsForTeacher(teacherId, query);
}

module.exports = {
  getOverview,
  getProfile,
  listClasses,
  getClassById,
  listSubjects,
  listStudents,
  listAnnouncements,
};
