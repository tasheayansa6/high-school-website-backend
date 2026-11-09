const { prisma } = require('../../config/database');
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

const YEAR_NOT_FOUND = 'ACADEMIC_YEAR_NOT_FOUND';
const TERM_NOT_FOUND = 'ACADEMIC_TERM_NOT_FOUND';

const yearInclude = {
  terms: {
    where: { deletedAt: null },
    orderBy: { sequence: 'asc' },
  },
};

// --- Serializers ---------------------------------------------------------

function toTerm(term) {
  return {
    id: term.id,
    academicYearId: term.academicYearId,
    name: term.name,
    sequence: term.sequence,
    startsOn: term.startsOn,
    endsOn: term.endsOn,
    deletedAt: term.deletedAt,
    createdAt: term.createdAt,
    updatedAt: term.updatedAt,
  };
}

function toAcademicYear(year) {
  return {
    id: year.id,
    name: year.name,
    code: year.code,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
    isCurrent: year.isCurrent,
    deletedAt: year.deletedAt,
    createdAt: year.createdAt,
    updatedAt: year.updatedAt,
    ...(year.terms ? { terms: year.terms.map(toTerm) } : {}),
  };
}

// --- Helpers -------------------------------------------------------------

async function findYearOrThrow(id, { includeDeleted = false, withTerms = false } = {}) {
  const year = await prisma.academicYear.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    ...(withTerms ? { include: yearInclude } : {}),
  });

  if (!year) {
    throw notFound('Academic year', YEAR_NOT_FOUND);
  }

  return year;
}

function assertDateOrder(startsOn, endsOn) {
  if (endsOn.getTime() < startsOn.getTime()) {
    throw validationFailure('endsOn must not be earlier than startsOn', 'endsOn');
  }
}

async function assertUniqueYearCode(code, excludeId = null) {
  const existing = await prisma.academicYear.findFirst({
    where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });

  if (existing) {
    throw conflict('An academic year with this code already exists.', 'ACADEMIC_YEAR_CODE_CONFLICT');
  }
}

function rethrowYearUnique(error) {
  if (isUniqueViolation(error)) {
    throw conflict('An academic year with this code already exists.', 'ACADEMIC_YEAR_CODE_CONFLICT');
  }
  throw error;
}

// --- Academic years ------------------------------------------------------

async function listAcademicYears({
  page = 1,
  limit = 20,
  q,
  isCurrent,
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);

  if (typeof isCurrent === 'boolean') {
    where.isCurrent = isCurrent;
  }

  if (q) {
    where.OR = [{ name: { contains: q } }, { code: { contains: q } }];
  }

  const [total, items] = await Promise.all([
    prisma.academicYear.count({ where }),
    prisma.academicYear.findMany({
      where,
      orderBy: [{ startsOn: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toAcademicYear),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getAcademicYearById(id, { includeDeleted = false } = {}) {
  const year = await findYearOrThrow(id, { includeDeleted, withTerms: true });
  return toAcademicYear(year);
}

async function createAcademicYear(payload, admin, requestMeta = {}) {
  assertDateOrder(payload.startsOn, payload.endsOn);
  await assertUniqueYearCode(payload.code);

  try {
    const year = await prisma.$transaction(async (tx) => {
      if (payload.isCurrent) {
        await tx.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      const created = await tx.academicYear.create({
        data: {
          name: payload.name,
          code: payload.code,
          startsOn: payload.startsOn,
          endsOn: payload.endsOn,
          isCurrent: payload.isCurrent === true,
        },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'academic-years.create',
        entityType: 'AcademicYear',
        entityId: created.id,
        metadata: { code: created.code },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    return toAcademicYear(year);
  } catch (error) {
    return rethrowYearUnique(error);
  }
}

async function updateAcademicYear(id, updates, admin, requestMeta = {}) {
  const existing = await findYearOrThrow(id);
  const data = {};

  for (const field of ['name', 'startsOn', 'endsOn']) {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
    }
  }

  if (updates.code && updates.code !== existing.code) {
    await assertUniqueYearCode(updates.code, existing.id);
    data.code = updates.code;
  }

  assertDateOrder(data.startsOn || existing.startsOn, data.endsOn || existing.endsOn);

  try {
    const year = await prisma.$transaction(async (tx) => {
      const updated = await tx.academicYear.update({ where: { id: existing.id }, data });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'academic-years.update',
        entityType: 'AcademicYear',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates) },
        ipAddress: getIp(requestMeta),
      });

      return updated;
    });

    return toAcademicYear(year);
  } catch (error) {
    return rethrowYearUnique(error);
  }
}

/**
 * Mark one year as current and clear the flag on all others atomically.
 */
async function setCurrentAcademicYear(id, admin, requestMeta = {}) {
  const existing = await findYearOrThrow(id);

  const year = await prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({
      where: { isCurrent: true, NOT: { id: existing.id } },
      data: { isCurrent: false },
    });

    const updated = await tx.academicYear.update({
      where: { id: existing.id },
      data: { isCurrent: true },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'academic-years.set-current',
      entityType: 'AcademicYear',
      entityId: updated.id,
      metadata: { code: updated.code },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAcademicYear(year);
}

async function softDeleteAcademicYear(id, admin, requestMeta = {}) {
  const existing = await findYearOrThrow(id);

  const [offerings, enrollments] = await Promise.all([
    prisma.classOffering.count({ where: { academicYearId: id, deletedAt: null } }),
    prisma.enrollment.count({ where: { academicYearId: id, deletedAt: null } }),
  ]);

  if (offerings > 0 || enrollments > 0) {
    throw conflict(
      'Academic year has active class offerings or enrollments and cannot be deleted.',
      'ACADEMIC_YEAR_HAS_DEPENDENTS'
    );
  }

  const year = await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.academicTerm.updateMany({
      where: { academicYearId: id, deletedAt: null },
      data: { deletedAt: now },
    });

    const updated = await tx.academicYear.update({
      where: { id: existing.id },
      data: { deletedAt: now, isCurrent: false },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'academic-years.delete',
      entityType: 'AcademicYear',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAcademicYear(year);
}

// --- Terms ---------------------------------------------------------------

function assertTermWithinYear(year, startsOn, endsOn) {
  if (
    startsOn.getTime() < year.startsOn.getTime() ||
    endsOn.getTime() > year.endsOn.getTime()
  ) {
    throw validationFailure(
      'Term dates must fall within the academic year dates.',
      'startsOn'
    );
  }
}

async function assertUniqueTermSequence(academicYearId, sequence, excludeId = null) {
  const existing = await prisma.academicTerm.findFirst({
    where: { academicYearId, sequence, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });

  if (existing) {
    throw conflict(
      'A term with this sequence already exists for the academic year.',
      'ACADEMIC_TERM_SEQUENCE_CONFLICT'
    );
  }
}

function rethrowTermUnique(error) {
  if (isUniqueViolation(error)) {
    throw conflict(
      'A term with this sequence already exists for the academic year.',
      'ACADEMIC_TERM_SEQUENCE_CONFLICT'
    );
  }
  throw error;
}

async function findTermOrThrow(yearId, termId) {
  const term = await prisma.academicTerm.findFirst({
    where: { id: termId, academicYearId: yearId, deletedAt: null },
  });

  if (!term) {
    throw notFound('Academic term', TERM_NOT_FOUND);
  }

  return term;
}

async function listTerms(yearId) {
  await findYearOrThrow(yearId);

  const terms = await prisma.academicTerm.findMany({
    where: { academicYearId: yearId, deletedAt: null },
    orderBy: { sequence: 'asc' },
  });

  return { items: terms.map(toTerm) };
}

async function createTerm(yearId, payload, admin, requestMeta = {}) {
  const year = await findYearOrThrow(yearId);

  assertTermWithinYear(year, payload.startsOn, payload.endsOn);
  await assertUniqueTermSequence(yearId, payload.sequence);

  try {
    const term = await prisma.$transaction(async (tx) => {
      const created = await tx.academicTerm.create({
        data: {
          academicYearId: yearId,
          name: payload.name,
          sequence: payload.sequence,
          startsOn: payload.startsOn,
          endsOn: payload.endsOn,
        },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'academic-terms.create',
        entityType: 'AcademicTerm',
        entityId: created.id,
        metadata: { academicYearId: yearId, sequence: created.sequence },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    return toTerm(term);
  } catch (error) {
    return rethrowTermUnique(error);
  }
}

async function updateTerm(yearId, termId, updates, admin, requestMeta = {}) {
  const year = await findYearOrThrow(yearId);
  const existing = await findTermOrThrow(yearId, termId);
  const data = {};

  for (const field of ['name', 'sequence', 'startsOn', 'endsOn']) {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
    }
  }

  const startsOn = data.startsOn || existing.startsOn;
  const endsOn = data.endsOn || existing.endsOn;
  assertDateOrder(startsOn, endsOn);
  assertTermWithinYear(year, startsOn, endsOn);

  if (data.sequence !== undefined && data.sequence !== existing.sequence) {
    await assertUniqueTermSequence(yearId, data.sequence, existing.id);
  }

  try {
    const term = await prisma.$transaction(async (tx) => {
      const updated = await tx.academicTerm.update({ where: { id: existing.id }, data });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'academic-terms.update',
        entityType: 'AcademicTerm',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates) },
        ipAddress: getIp(requestMeta),
      });

      return updated;
    });

    return toTerm(term);
  } catch (error) {
    return rethrowTermUnique(error);
  }
}

module.exports = {
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  setCurrentAcademicYear,
  softDeleteAcademicYear,
  listTerms,
  createTerm,
  updateTerm,
};
