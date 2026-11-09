const { prisma } = require('../../config/database');
const { toTeacherRef } = require('../../utils/smsSerializers');
const { buildTermScopeKey, buildDeletedTermScopeKey } = require('../../utils/smsScope');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');

const ASSIGNMENT_NOT_FOUND = 'TEACHING_ASSIGNMENT_NOT_FOUND';

const assignmentInclude = {
  teacher: {
    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
  },
  subject: { select: { id: true, name: true, code: true } },
  classOffering: {
    select: { id: true, name: true, academicYearId: true, gradeLevelId: true, sectionId: true },
  },
  academicTerm: { select: { id: true, name: true, sequence: true, academicYearId: true } },
};

function toTeachingAssignment(assignment) {
  return {
    id: assignment.id,
    teacherId: assignment.teacherId,
    classOfferingId: assignment.classOfferingId,
    subjectId: assignment.subjectId,
    academicTermId: assignment.academicTermId,
    termScopeKey: assignment.termScopeKey,
    isPrimary: assignment.isPrimary,
    teacher: assignment.teacher ? toTeacherRef(assignment.teacher) : undefined,
    subject: assignment.subject || undefined,
    classOffering: assignment.classOffering || undefined,
    academicTerm: assignment.academicTerm || null,
    deletedAt: assignment.deletedAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

function duplicateError() {
  return conflict(
    'This teacher is already assigned to this subject for the class and term scope.',
    'TEACHING_ASSIGNMENT_DUPLICATE'
  );
}

async function findAssignmentOrThrow(id, { includeDeleted = false } = {}) {
  const assignment = await prisma.teachingAssignment.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: assignmentInclude,
  });

  if (!assignment) {
    throw notFound('Teaching assignment', ASSIGNMENT_NOT_FOUND);
  }

  return assignment;
}

async function listTeachingAssignments({
  page = 1,
  limit = 20,
  teacherId,
  classOfferingId,
  subjectId,
  academicTermId,
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);

  if (teacherId) where.teacherId = teacherId;
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (subjectId) where.subjectId = subjectId;
  if (academicTermId) where.academicTermId = academicTermId;

  const [total, items] = await Promise.all([
    prisma.teachingAssignment.count({ where }),
    prisma.teachingAssignment.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: assignmentInclude,
    }),
  ]);

  return {
    items: items.map(toTeachingAssignment),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getTeachingAssignmentById(id, options = {}) {
  return toTeachingAssignment(await findAssignmentOrThrow(id, options));
}

async function createTeachingAssignment(payload, admin, requestMeta = {}) {
  const [teacher, classOffering, subject] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: payload.teacherId, deletedAt: null } }),
    prisma.classOffering.findFirst({ where: { id: payload.classOfferingId, deletedAt: null } }),
    prisma.subject.findFirst({ where: { id: payload.subjectId, deletedAt: null } }),
  ]);

  if (!teacher) throw notFound('Teacher', 'TEACHER_NOT_FOUND');
  if (!classOffering) throw notFound('Class offering', 'CLASS_OFFERING_NOT_FOUND');
  if (!subject) throw notFound('Subject', 'SUBJECT_NOT_FOUND');

  const academicTermId = payload.academicTermId == null ? null : payload.academicTermId;

  if (academicTermId != null) {
    const term = await prisma.academicTerm.findFirst({
      where: { id: academicTermId, deletedAt: null },
    });

    if (!term) {
      throw notFound('Academic term', 'ACADEMIC_TERM_NOT_FOUND');
    }

    if (term.academicYearId !== classOffering.academicYearId) {
      throw validationFailure(
        "academicTermId must belong to the class offering's academic year",
        'academicTermId'
      );
    }
  }

  const termScopeKey = buildTermScopeKey(academicTermId);

  const duplicate = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      classOfferingId: classOffering.id,
      subjectId: subject.id,
      termScopeKey,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw duplicateError();
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.teachingAssignment.create({
        data: {
          teacherId: teacher.id,
          classOfferingId: classOffering.id,
          subjectId: subject.id,
          academicTermId,
          termScopeKey,
          isPrimary: payload.isPrimary === true,
        },
        include: assignmentInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'teaching-assignments.create',
        entityType: 'TeachingAssignment',
        entityId: created.id,
        metadata: {
          teacherId: teacher.id,
          classOfferingId: classOffering.id,
          subjectId: subject.id,
          termScopeKey,
        },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    return toTeachingAssignment(assignment);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateError();
    }
    throw error;
  }
}

/**
 * Soft-delete rewrites termScopeKey so the same assignment can be created again later.
 */
async function softDeleteTeachingAssignment(id, admin, requestMeta = {}) {
  const existing = await findAssignmentOrThrow(id);

  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.teachingAssignment.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        termScopeKey: buildDeletedTermScopeKey(existing.termScopeKey, existing.id),
      },
      include: assignmentInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'teaching-assignments.delete',
      entityType: 'TeachingAssignment',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toTeachingAssignment(assignment);
}

module.exports = {
  listTeachingAssignments,
  getTeachingAssignmentById,
  createTeachingAssignment,
  softDeleteTeachingAssignment,
};
