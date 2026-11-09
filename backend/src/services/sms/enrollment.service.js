const { prisma } = require('../../config/database');
const { toStudentRef } = require('../../utils/smsSerializers');
const {
  buildActiveScopeKey,
  buildDeletedEnrollmentScopeKey,
} = require('../../utils/smsScope');
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

const ENROLLMENT_NOT_FOUND = 'ENROLLMENT_NOT_FOUND';

const enrollmentInclude = {
  student: {
    select: { id: true, firstName: true, lastName: true, email: true, studentCode: true },
  },
  classOffering: {
    select: { id: true, name: true, academicYearId: true, gradeLevelId: true, sectionId: true },
  },
};

function toEnrollment(enrollment) {
  return {
    id: enrollment.id,
    studentId: enrollment.studentId,
    classOfferingId: enrollment.classOfferingId,
    academicYearId: enrollment.academicYearId,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    leftAt: enrollment.leftAt,
    student: enrollment.student ? toStudentRef(enrollment.student) : undefined,
    classOffering: enrollment.classOffering || undefined,
    deletedAt: enrollment.deletedAt,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
}

function duplicateError() {
  return conflict(
    'This student is already enrolled in this class offering.',
    'ENROLLMENT_DUPLICATE'
  );
}

async function findEnrollmentOrThrow(id, { includeDeleted = false } = {}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: enrollmentInclude,
  });

  if (!enrollment) {
    throw notFound('Enrollment', ENROLLMENT_NOT_FOUND);
  }

  return enrollment;
}

async function listEnrollments({
  page = 1,
  limit = 20,
  studentId,
  classOfferingId,
  academicYearId,
  status,
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);

  if (studentId) where.studentId = studentId;
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (academicYearId) where.academicYearId = academicYearId;
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: enrollmentInclude,
    }),
  ]);

  return {
    items: items.map(toEnrollment),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getEnrollmentById(id, options = {}) {
  return toEnrollment(await findEnrollmentOrThrow(id, options));
}

async function createEnrollment(payload, admin, requestMeta = {}) {
  const [student, classOffering] = await Promise.all([
    prisma.student.findFirst({ where: { id: payload.studentId, deletedAt: null } }),
    prisma.classOffering.findFirst({ where: { id: payload.classOfferingId, deletedAt: null } }),
  ]);

  if (!student) throw notFound('Student', 'STUDENT_NOT_FOUND');
  if (!classOffering) throw notFound('Class offering', 'CLASS_OFFERING_NOT_FOUND');

  if (payload.academicYearId !== classOffering.academicYearId) {
    throw validationFailure(
      "academicYearId must match the class offering's academic year",
      'academicYearId'
    );
  }

  const activeScopeKey = buildActiveScopeKey(student.id, classOffering.id);

  const duplicate = await prisma.enrollment.findFirst({
    where: { activeScopeKey },
    select: { id: true },
  });

  if (duplicate) {
    throw duplicateError();
  }

  const status = payload.status || 'ACTIVE';

  try {
    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.create({
        data: {
          studentId: student.id,
          classOfferingId: classOffering.id,
          academicYearId: classOffering.academicYearId,
          status,
          enrolledAt: payload.enrolledAt || new Date(),
          leftAt: status === 'ACTIVE' ? null : new Date(),
          activeScopeKey,
        },
        include: enrollmentInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'enrollments.create',
        entityType: 'Enrollment',
        entityId: created.id,
        metadata: {
          studentId: student.id,
          classOfferingId: classOffering.id,
          status,
        },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    return toEnrollment(enrollment);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateError();
    }
    throw error;
  }
}

async function updateEnrollmentStatus(id, { status, leftAt }, admin, requestMeta = {}) {
  const existing = await findEnrollmentOrThrow(id);

  let nextLeftAt = null;
  if (status !== 'ACTIVE') {
    nextLeftAt = leftAt || existing.leftAt || new Date();
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: existing.id },
      data: { status, leftAt: nextLeftAt },
      include: enrollmentInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'enrollments.update-status',
      entityType: 'Enrollment',
      entityId: updated.id,
      metadata: { from: existing.status, to: status },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toEnrollment(enrollment);
}

/**
 * Soft-delete rewrites activeScopeKey so a new enrollment for the same
 * student + class offering can be created later.
 */
async function softDeleteEnrollment(id, admin, requestMeta = {}) {
  const existing = await findEnrollmentOrThrow(id);

  const enrollment = await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        activeScopeKey: buildDeletedEnrollmentScopeKey(
          existing.studentId,
          existing.classOfferingId,
          existing.id
        ),
      },
      include: enrollmentInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'enrollments.delete',
      entityType: 'Enrollment',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toEnrollment(enrollment);
}

module.exports = {
  listEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollmentStatus,
  softDeleteEnrollment,
};
