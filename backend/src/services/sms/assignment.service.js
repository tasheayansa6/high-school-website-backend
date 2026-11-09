const { prisma } = require('../../config/database');
const { toStudentRef } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  conflict,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');
const {
  toNumber,
  auditActor,
  studentRefSelect,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
  teacherTeachesClassSubject,
} = require('./ops.helpers');

const ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND';
const SUBMISSION_NOT_FOUND = 'SUBMISSION_NOT_FOUND';

const teacherRefSelect = { id: true, firstName: true, lastName: true, email: true };

const assignmentInclude = {
  classOffering: { select: classRefSelect },
  subject: { select: subjectRefSelect },
  teacher: { select: teacherRefSelect },
};

function toAssignment(assignment, { submission } = {}) {
  const result = {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    classOfferingId: assignment.classOfferingId,
    subjectId: assignment.subjectId,
    teacherId: assignment.teacherId,
    dueAt: assignment.dueAt,
    maxScore: toNumber(assignment.maxScore),
    isPublished: assignment.isPublished,
    classOffering: assignment.classOffering || undefined,
    subject: assignment.subject || undefined,
    teacher: assignment.teacher || undefined,
    deletedAt: assignment.deletedAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
  if (submission !== undefined) result.submission = submission;
  return result;
}

function toSubmission(submission) {
  return {
    id: submission.id,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    content: submission.content,
    status: submission.status,
    score: toNumber(submission.score),
    feedback: submission.feedback,
    submittedAt: submission.submittedAt,
    gradedAt: submission.gradedAt,
    gradedById: submission.gradedById,
    student: submission.student ? toStudentRef(submission.student) : undefined,
    deletedAt: submission.deletedAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

/**
 * @param {{ teacherId?: number }} scope when teacherId is set, only that teacher's assignments are visible.
 */
async function findAssignmentOrThrow(id, { includeDeleted = false } = {}, scope = {}) {
  const where = whereWithDeleted({ id }, includeDeleted);
  if (scope.teacherId) where.teacherId = scope.teacherId;

  const assignment = await prisma.assignment.findFirst({ where, include: assignmentInclude });
  if (!assignment) throw notFound('Assignment', ASSIGNMENT_NOT_FOUND);
  return assignment;
}

async function listAssignments(
  { page = 1, limit = 20, q, classOfferingId, subjectId, teacherId, isPublished, includeDeleted = false } = {},
  scope = {}
) {
  const where = whereWithDeleted({}, includeDeleted);

  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (subjectId) where.subjectId = subjectId;
  if (teacherId) where.teacherId = teacherId;
  if (scope.teacherId) where.teacherId = scope.teacherId;
  if (isPublished !== undefined) where.isPublished = isPublished;
  if (q) where.title = { contains: q };

  const [total, items] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: assignmentInclude,
    }),
  ]);

  return { items: items.map((row) => toAssignment(row)), pagination: buildPagination({ page, limit, total }) };
}

async function getAssignmentById(id, options = {}, scope = {}) {
  return toAssignment(await findAssignmentOrThrow(id, options, scope));
}

async function createAssignment(payload, actor, requestMeta = {}) {
  const [classOffering, subject, teacher] = await Promise.all([
    findClassOfferingOrThrow(payload.classOfferingId),
    findSubjectOrThrow(payload.subjectId),
    prisma.teacher.findFirst({ where: { id: payload.teacherId, deletedAt: null } }),
  ]);
  if (!teacher) throw notFound('Teacher', 'TEACHER_NOT_FOUND');

  const teaches = await teacherTeachesClassSubject(teacher.id, classOffering.id, subject.id);
  if (!teaches) {
    throw validationFailure(
      'Teacher is not assigned to teach this subject in this class offering',
      'teacherId'
    );
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.assignment.create({
      data: {
        title: payload.title,
        description: payload.description ?? null,
        classOfferingId: classOffering.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dueAt: payload.dueAt ?? null,
        ...(payload.maxScore !== undefined ? { maxScore: payload.maxScore } : {}),
        ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
      },
      include: assignmentInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assignments.create',
      entityType: 'Assignment',
      entityId: created.id,
      metadata: { classOfferingId: classOffering.id, subjectId: subject.id, teacherId: teacher.id },
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  const result = toAssignment(assignment);
  if (result.isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyAssignmentPublished(result);
  }
  return result;
}

async function updateAssignment(id, payload, actor, requestMeta = {}, scope = {}) {
  const existing = await findAssignmentOrThrow(id, {}, scope);

  const data = {};
  for (const key of ['title', 'description', 'dueAt', 'maxScore', 'isPublished']) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id: existing.id },
      data,
      include: assignmentInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assignments.update',
      entityType: 'Assignment',
      entityId: updated.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toAssignment(assignment);
  if (payload.isPublished === true && result.isPublished && !existing.isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyAssignmentPublished(result);
  }
  return result;
}

async function softDeleteAssignment(id, actor, requestMeta = {}, scope = {}) {
  const existing = await findAssignmentOrThrow(id, {}, scope);

  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: assignmentInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assignments.delete',
      entityType: 'Assignment',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAssignment(assignment);
}

async function listSubmissions(assignmentId, { page = 1, limit = 20, status } = {}, scope = {}) {
  const assignment = await findAssignmentOrThrow(assignmentId, {}, scope);

  const where = { assignmentId: assignment.id, deletedAt: null };
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.assignmentSubmission.count({ where }),
    prisma.assignmentSubmission.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { student: { select: studentRefSelect } },
    }),
  ]);

  return {
    assignment: toAssignment(assignment),
    items: items.map(toSubmission),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function gradeSubmission(assignmentId, submissionId, { score, feedback, status }, actor, requestMeta = {}, scope = {}) {
  const assignment = await findAssignmentOrThrow(assignmentId, {}, scope);

  const existing = await prisma.assignmentSubmission.findFirst({
    where: { id: submissionId, assignmentId: assignment.id, deletedAt: null },
  });
  if (!existing) throw notFound('Submission', SUBMISSION_NOT_FOUND);

  if (score > Number(assignment.maxScore)) {
    throw validationFailure(`score cannot exceed the assignment max score (${Number(assignment.maxScore)})`, 'score');
  }

  const submission = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        score,
        feedback: feedback ?? null,
        status: status || 'GRADED',
        gradedAt: new Date(),
        gradedById: actor.teacherId || null,
      },
      include: { student: { select: studentRefSelect } },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assignments.grade-submission',
      entityType: 'AssignmentSubmission',
      entityId: updated.id,
      metadata: { assignmentId: assignment.id, studentId: updated.studentId, score },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toSubmission(submission);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAssignmentGraded(assignment, result.studentId);
  return result;
}

// ---------------------------------------------------------------------------
// Student-facing
// ---------------------------------------------------------------------------

async function activeClassIdsForStudent(studentId) {
  const rows = await prisma.enrollment.findMany({
    where: { studentId, status: 'ACTIVE', deletedAt: null, classOffering: { deletedAt: null } },
    select: { classOfferingId: true },
  });
  return rows.map((row) => row.classOfferingId);
}

/** Published assignments for the student's enrolled classes + their own submission. */
async function listAssignmentsForStudent(studentId, { page = 1, limit = 20, classOfferingId, subjectId } = {}) {
  const classIds = await activeClassIdsForStudent(studentId);
  const where = {
    deletedAt: null,
    isPublished: true,
    classOfferingId: { in: classIds },
  };
  if (classOfferingId) where.classOfferingId = classIds.includes(classOfferingId) ? classOfferingId : -1;
  if (subjectId) where.subjectId = subjectId;

  const [total, items] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: assignmentInclude,
    }),
  ]);

  const submissions = items.length
    ? await prisma.assignmentSubmission.findMany({
        where: { studentId, deletedAt: null, assignmentId: { in: items.map((row) => row.id) } },
      })
    : [];
  const byAssignment = new Map(submissions.map((row) => [row.assignmentId, toSubmission(row)]));

  return {
    items: items.map((row) => toAssignment(row, { submission: byAssignment.get(row.id) || null })),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function submitAssignment(assignmentId, studentId, { content }, requestMeta = {}) {
  const classIds = await activeClassIdsForStudent(studentId);
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      deletedAt: null,
      isPublished: true,
      classOfferingId: { in: classIds },
    },
  });
  if (!assignment) throw notFound('Assignment', ASSIGNMENT_NOT_FOUND);

  const existing = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId: assignment.id, studentId },
  });
  if (existing && !existing.deletedAt && existing.status === 'GRADED') {
    throw conflict('This submission has already been graded and cannot be changed.', 'SUBMISSION_LOCKED');
  }

  const now = new Date();
  const status = assignment.dueAt && now > assignment.dueAt ? 'LATE' : 'SUBMITTED';

  const submission = await prisma.$transaction(async (tx) => {
    const saved = await tx.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
      create: { assignmentId: assignment.id, studentId, content, status, submittedAt: now },
      update: {
        content,
        status,
        submittedAt: now,
        score: null,
        feedback: null,
        gradedAt: null,
        gradedById: null,
        deletedAt: null,
      },
    });

    await recordAudit({
      tx,
      studentId,
      action: 'assignments.submit',
      entityType: 'AssignmentSubmission',
      entityId: saved.id,
      metadata: { assignmentId: assignment.id, status },
      ipAddress: getIp(requestMeta),
    });

    return saved;
  });

  const result = toSubmission(submission);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAssignmentSubmitted(assignment, studentId);
  return result;
}

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  listSubmissions,
  gradeSubmission,
  listAssignmentsForStudent,
  submitAssignment,
};
