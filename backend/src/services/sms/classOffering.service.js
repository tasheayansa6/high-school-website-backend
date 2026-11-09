const { prisma } = require('../../config/database');
const { toTeacherRef } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  getIp,
  whereWithDeleted,
} = require('./common');

const CLASS_NOT_FOUND = 'CLASS_OFFERING_NOT_FOUND';

const classInclude = {
  academicYear: { select: { id: true, name: true, code: true, isCurrent: true } },
  gradeLevel: { select: { id: true, name: true, code: true, sortOrder: true } },
  section: { select: { id: true, name: true, code: true } },
  homeroomTeacher: {
    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
  },
};

function toClassOffering(offering) {
  return {
    id: offering.id,
    name: offering.name,
    academicYearId: offering.academicYearId,
    gradeLevelId: offering.gradeLevelId,
    sectionId: offering.sectionId,
    homeroomTeacherId: offering.homeroomTeacherId,
    academicYear: offering.academicYear || undefined,
    gradeLevel: offering.gradeLevel || undefined,
    section: offering.section || undefined,
    homeroomTeacher: offering.homeroomTeacher
      ? toTeacherRef(offering.homeroomTeacher)
      : null,
    deletedAt: offering.deletedAt,
    createdAt: offering.createdAt,
    updatedAt: offering.updatedAt,
  };
}

async function requireLive(model, id, label, code) {
  const row = await prisma[model].findFirst({ where: { id, deletedAt: null } });
  if (!row) {
    throw notFound(label, code);
  }
  return row;
}

async function assertHomeroomTeacher(teacherId) {
  if (teacherId == null) return null;
  const teacher = await requireLive('teacher', teacherId, 'Teacher', 'TEACHER_NOT_FOUND');
  return teacher.id;
}

function rethrowUnique(error) {
  if (isUniqueViolation(error)) {
    throw conflict(
      'A class offering already exists for this academic year, grade level, and section.',
      'CLASS_OFFERING_CONFLICT'
    );
  }
  throw error;
}

async function findClassOrThrow(id, { includeDeleted = false } = {}) {
  const offering = await prisma.classOffering.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: classInclude,
  });

  if (!offering) {
    throw notFound('Class offering', CLASS_NOT_FOUND);
  }

  return offering;
}

async function listClassOfferings({
  page = 1,
  limit = 20,
  q,
  academicYearId,
  gradeLevelId,
  sectionId,
  homeroomTeacherId,
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);

  if (academicYearId) where.academicYearId = academicYearId;
  if (gradeLevelId) where.gradeLevelId = gradeLevelId;
  if (sectionId) where.sectionId = sectionId;
  if (homeroomTeacherId) where.homeroomTeacherId = homeroomTeacherId;
  if (q) where.name = { contains: q };

  const [total, items] = await Promise.all([
    prisma.classOffering.count({ where }),
    prisma.classOffering.findMany({
      where,
      orderBy: [{ academicYearId: 'desc' }, { gradeLevelId: 'asc' }, { sectionId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: classInclude,
    }),
  ]);

  return {
    items: items.map(toClassOffering),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getClassOfferingById(id, options = {}) {
  return toClassOffering(await findClassOrThrow(id, options));
}

async function createClassOffering(payload, admin, requestMeta = {}) {
  const [year, grade, section] = await Promise.all([
    requireLive('academicYear', payload.academicYearId, 'Academic year', 'ACADEMIC_YEAR_NOT_FOUND'),
    requireLive('gradeLevel', payload.gradeLevelId, 'Grade level', 'GRADE_LEVEL_NOT_FOUND'),
    requireLive('section', payload.sectionId, 'Section', 'SECTION_NOT_FOUND'),
  ]);
  const homeroomTeacherId = await assertHomeroomTeacher(payload.homeroomTeacherId);

  const duplicate = await prisma.classOffering.findFirst({
    where: {
      academicYearId: year.id,
      gradeLevelId: grade.id,
      sectionId: section.id,
    },
    select: { id: true, deletedAt: true },
  });

  if (duplicate) {
    throw conflict(
      duplicate.deletedAt
        ? 'A deleted class offering already exists for this academic year, grade level, and section.'
        : 'A class offering already exists for this academic year, grade level, and section.',
      'CLASS_OFFERING_CONFLICT'
    );
  }

  // Auto-generated name: "<Grade> <Section> (<Year code>)"
  const name = payload.name || `${grade.name} ${section.name} (${year.code})`;

  try {
    const offering = await prisma.$transaction(async (tx) => {
      const created = await tx.classOffering.create({
        data: {
          academicYearId: year.id,
          gradeLevelId: grade.id,
          sectionId: section.id,
          name,
          homeroomTeacherId,
        },
        include: classInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'class-offerings.create',
        entityType: 'ClassOffering',
        entityId: created.id,
        metadata: { name: created.name, academicYearId: year.id },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    return toClassOffering(offering);
  } catch (error) {
    return rethrowUnique(error);
  }
}

async function updateClassOffering(id, updates, admin, requestMeta = {}) {
  const existing = await findClassOrThrow(id);
  const data = {};

  if (updates.name !== undefined) {
    data.name = updates.name;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'homeroomTeacherId')) {
    data.homeroomTeacherId = await assertHomeroomTeacher(updates.homeroomTeacherId);
  }

  const offering = await prisma.$transaction(async (tx) => {
    const updated = await tx.classOffering.update({
      where: { id: existing.id },
      data,
      include: classInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'class-offerings.update',
      entityType: 'ClassOffering',
      entityId: updated.id,
      metadata: { fields: Object.keys(updates) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toClassOffering(offering);
}

async function softDeleteClassOffering(id, admin, requestMeta = {}) {
  const existing = await findClassOrThrow(id);

  const [assignments, enrollments] = await Promise.all([
    prisma.teachingAssignment.count({ where: { classOfferingId: id, deletedAt: null } }),
    prisma.enrollment.count({ where: { classOfferingId: id, deletedAt: null } }),
  ]);

  if (assignments > 0 || enrollments > 0) {
    throw conflict(
      'Class offering has active teaching assignments or enrollments and cannot be deleted.',
      'CLASS_OFFERING_HAS_DEPENDENTS'
    );
  }

  const offering = await prisma.$transaction(async (tx) => {
    const updated = await tx.classOffering.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: classInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'class-offerings.delete',
      entityType: 'ClassOffering',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toClassOffering(offering);
}

module.exports = {
  listClassOfferings,
  getClassOfferingById,
  createClassOffering,
  updateClassOffering,
  softDeleteClassOffering,
};
