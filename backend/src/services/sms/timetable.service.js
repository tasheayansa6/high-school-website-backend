/**
 * Timetable management: containers, slots, conflict detection, publication.
 */
const { prisma } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  conflict,
  validationFailure,
  getIp,
  whereWithDeleted,
  isUniqueViolation,
} = require('./common');
const {
  auditActor,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
} = require('./ops.helpers');

const TIMETABLE_NOT_FOUND = 'TIMETABLE_NOT_FOUND';
const ENTRY_NOT_FOUND = 'TIMETABLE_ENTRY_NOT_FOUND';
const CLASSROOM_NOT_FOUND = 'CLASSROOM_NOT_FOUND';

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const teacherRefSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  employeeCode: true,
  isActive: true,
};

const classroomRefSelect = { id: true, name: true, code: true, capacity: true };

const entryInclude = {
  subject: { select: subjectRefSelect },
  teacher: { select: teacherRefSelect },
  classroom: { select: classroomRefSelect },
};

const timetableInclude = {
  academicYear: { select: { id: true, name: true, code: true, isCurrent: true } },
  academicTerm: { select: { id: true, name: true, sequence: true } },
  classOffering: {
    select: {
      ...classRefSelect,
      name: true,
      gradeLevel: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true, code: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  entries: {
    where: { deletedAt: null },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    include: entryInclude,
  },
};

function termScopeKey(academicTermId) {
  return academicTermId == null ? 'YEAR' : String(academicTermId);
}

function timeToMinutes(hhmm) {
  const [, h, m] = TIME_RE.exec(hhmm) || [];
  return Number(h) * 60 + Number(m);
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function assertValidTimeRange(startTime, endTime) {
  if (!TIME_RE.test(startTime)) {
    throw validationFailure('startTime must be HH:mm (24h)', 'startTime');
  }
  if (!TIME_RE.test(endTime)) {
    throw validationFailure('endTime must be HH:mm (24h)', 'endTime');
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw validationFailure('endTime must be after startTime', 'endTime');
  }
}

function toEntry(row) {
  return {
    id: row.id,
    timetableId: row.timetableId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    subjectId: row.subjectId,
    teacherId: row.teacherId,
    classroomId: row.classroomId,
    isActive: row.isActive,
    notes: row.notes,
    subject: row.subject || undefined,
    teacher: row.teacher
      ? {
          id: row.teacher.id,
          firstName: row.teacher.firstName,
          lastName: row.teacher.lastName,
          email: row.teacher.email,
          employeeCode: row.teacher.employeeCode,
        }
      : undefined,
    classroom: row.classroom || undefined,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTimetable(row, { includeEntries = true } = {}) {
  const base = {
    id: row.id,
    academicYearId: row.academicYearId,
    academicTermId: row.academicTermId,
    termScopeKey: row.termScopeKey,
    classOfferingId: row.classOfferingId,
    title: row.title,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt,
    createdById: row.createdById,
    academicYear: row.academicYear || undefined,
    academicTerm: row.academicTerm || undefined,
    classOffering: row.classOffering || undefined,
    createdBy: row.createdBy || undefined,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (includeEntries && row.entries) {
    base.entries = row.entries.filter((e) => e.deletedAt == null).map(toEntry);
  }
  return base;
}

function toClassroom(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    capacity: row.capacity,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function findTimetableOrThrow(id, { includeDeleted = false } = {}) {
  const row = await prisma.timetable.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: timetableInclude,
  });
  if (!row) throw notFound('Timetable', TIMETABLE_NOT_FOUND);
  return row;
}

async function findEntryOrThrow(id) {
  const row = await prisma.timetableEntry.findFirst({
    where: { id, deletedAt: null },
    include: { ...entryInclude, timetable: true },
  });
  if (!row) throw notFound('Timetable entry', ENTRY_NOT_FOUND);
  return row;
}

async function resolveYearAndTerm(academicYearId, academicTermId) {
  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, deletedAt: null },
  });
  if (!year) throw notFound('Academic year', 'ACADEMIC_YEAR_NOT_FOUND');

  if (academicTermId == null) {
    return { year, term: null, scope: 'YEAR' };
  }

  const term = await prisma.academicTerm.findFirst({
    where: { id: academicTermId, academicYearId, deletedAt: null },
  });
  if (!term) {
    throw validationFailure(
      'academicTermId must belong to the selected academic year',
      'academicTermId'
    );
  }
  return { year, term, scope: String(term.id) };
}

/**
 * Teacher must be active and have a live teaching assignment for the class + subject
 * that covers the timetable's term scope (YEAR assignment or matching term).
 */
async function assertTeacherEligible({ teacherId, classOfferingId, subjectId, academicTermId }) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, deletedAt: null },
  });
  if (!teacher) throw notFound('Teacher', 'TEACHER_NOT_FOUND');
  if (!teacher.isActive) {
    throw validationFailure('Teacher account is inactive', 'teacherId');
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      classOfferingId,
      subjectId,
      deletedAt: null,
    },
  });
  if (!assignments.length) {
    throw validationFailure(
      'Teacher is not assigned to teach this subject in this class',
      'teacherId'
    );
  }

  const eligible = assignments.some((row) => {
    if (row.academicTermId == null) return true;
    if (academicTermId == null) return false;
    return row.academicTermId === academicTermId;
  });
  if (!eligible) {
    throw validationFailure(
      'Teacher assignment does not cover this academic term',
      'teacherId'
    );
  }
}

async function assertClassroom(classroomId) {
  if (classroomId == null) return null;
  const room = await prisma.classroom.findFirst({
    where: { id: classroomId, deletedAt: null },
  });
  if (!room) throw notFound('Classroom', CLASSROOM_NOT_FOUND);
  return room;
}

/**
 * Detect teacher / classroom / class overlaps for an active slot.
 * Returns an array of conflict descriptors (empty = ok).
 */
async function detectConflicts({
  timetableId,
  classOfferingId,
  dayOfWeek,
  startTime,
  endTime,
  teacherId,
  classroomId,
  excludeEntryId = null,
}) {
  const conflicts = [];
  const activeWhere = {
    deletedAt: null,
    isActive: true,
    dayOfWeek,
    ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
  };

  const teacherSlots = await prisma.timetableEntry.findMany({
    where: { ...activeWhere, teacherId },
    include: {
      timetable: { select: { id: true, classOfferingId: true, isPublished: true } },
      subject: { select: subjectRefSelect },
    },
  });
  for (const slot of teacherSlots) {
    if (timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      conflicts.push({
        type: 'TEACHER',
        message: 'Teacher is already scheduled at this time',
        entryId: slot.id,
        timetableId: slot.timetableId,
        classOfferingId: slot.timetable.classOfferingId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: slot.subject,
      });
    }
  }

  if (classroomId != null) {
    const roomSlots = await prisma.timetableEntry.findMany({
      where: { ...activeWhere, classroomId },
      include: {
        timetable: { select: { id: true, classOfferingId: true } },
        subject: { select: subjectRefSelect },
      },
    });
    for (const slot of roomSlots) {
      if (timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        conflicts.push({
          type: 'CLASSROOM',
          message: 'Classroom is already booked at this time',
          entryId: slot.id,
          timetableId: slot.timetableId,
          classOfferingId: slot.timetable.classOfferingId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: slot.subject,
        });
      }
    }
  }

  const classSlots = await prisma.timetableEntry.findMany({
    where: {
      ...activeWhere,
      timetable: { id: timetableId, classOfferingId, deletedAt: null },
    },
    include: { subject: { select: subjectRefSelect } },
  });
  for (const slot of classSlots) {
    if (timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      conflicts.push({
        type: 'CLASS',
        message: 'This class already has a subject scheduled at this time',
        entryId: slot.id,
        timetableId,
        classOfferingId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: slot.subject,
      });
    }
  }

  return conflicts;
}

async function assertNoConflicts(params) {
  const conflicts = await detectConflicts(params);
  if (conflicts.length) {
    throw new AppError(conflicts[0].message, 409, {
      code: 'TIMETABLE_CONFLICT',
      errors: conflicts.map((c) => ({ field: c.type.toLowerCase(), message: c.message })),
    });
  }
}

// ---- Classrooms ----------------------------------------------------------------

async function listClassrooms({ page = 1, limit = 50, q, includeDeleted = false } = {}) {
  const where = whereWithDeleted({}, includeDeleted);
  if (q) {
    where.OR = [{ name: { contains: q } }, { code: { contains: q } }];
  }
  const [total, items] = await Promise.all([
    prisma.classroom.count({ where }),
    prisma.classroom.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items: items.map(toClassroom), pagination: buildPagination({ page, limit, total }) };
}

async function createClassroom(payload, admin, requestMeta = {}) {
  try {
    const created = await prisma.classroom.create({
      data: {
        name: payload.name,
        code: payload.code,
        capacity: payload.capacity ?? null,
      },
    });
    await recordAudit({
      action: 'CLASSROOM_CREATE',
      entityType: 'Classroom',
      entityId: String(created.id),
      ...auditActor({ adminId: admin.id }),
      ipAddress: getIp(requestMeta),
      metadata: { code: created.code },
    });
    return toClassroom(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A classroom with this code already exists.', 'CLASSROOM_CODE_CONFLICT');
    }
    throw error;
  }
}

async function updateClassroom(id, payload, admin, requestMeta = {}) {
  const existing = await prisma.classroom.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Classroom', CLASSROOM_NOT_FOUND);
  try {
    const updated = await prisma.classroom.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
      },
    });
    await recordAudit({
      action: 'CLASSROOM_UPDATE',
      entityType: 'Classroom',
      entityId: String(id),
      ...auditActor({ adminId: admin.id }),
      ipAddress: getIp(requestMeta),
    });
    return toClassroom(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A classroom with this code already exists.', 'CLASSROOM_CODE_CONFLICT');
    }
    throw error;
  }
}

async function softDeleteClassroom(id, admin, requestMeta = {}) {
  const existing = await prisma.classroom.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Classroom', CLASSROOM_NOT_FOUND);
  const updated = await prisma.classroom.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await recordAudit({
    action: 'CLASSROOM_DELETE',
    entityType: 'Classroom',
    entityId: String(id),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  return toClassroom(updated);
}

// ---- Timetables ----------------------------------------------------------------

async function listTimetables({
  page = 1,
  limit = 20,
  academicYearId,
  academicTermId,
  classOfferingId,
  teacherId,
  subjectId,
  dayOfWeek,
  isPublished,
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);
  if (academicYearId) where.academicYearId = academicYearId;
  if (academicTermId !== undefined) {
    where.academicTermId = academicTermId;
  }
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (isPublished !== undefined) where.isPublished = isPublished;

  if (teacherId || subjectId || dayOfWeek) {
    where.entries = {
      some: {
        deletedAt: null,
        isActive: true,
        ...(teacherId ? { teacherId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(dayOfWeek ? { dayOfWeek } : {}),
      },
    };
  }

  const [total, items] = await Promise.all([
    prisma.timetable.count({ where }),
    prisma.timetable.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: timetableInclude,
    }),
  ]);

  return {
    items: items.map((row) => toTimetable(row)),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getTimetableById(id, options = {}) {
  return toTimetable(await findTimetableOrThrow(id, options));
}

async function createTimetable(payload, admin, requestMeta = {}) {
  const classOffering = await findClassOfferingOrThrow(payload.classOfferingId);
  if (classOffering.academicYearId !== payload.academicYearId) {
    throw validationFailure(
      'classOfferingId must belong to the selected academic year',
      'classOfferingId'
    );
  }
  const { scope } = await resolveYearAndTerm(payload.academicYearId, payload.academicTermId ?? null);

  try {
    const created = await prisma.timetable.create({
      data: {
        academicYearId: payload.academicYearId,
        academicTermId: payload.academicTermId ?? null,
        termScopeKey: scope,
        classOfferingId: payload.classOfferingId,
        title: payload.title ?? null,
        isPublished: false,
        createdById: admin.id,
      },
      include: timetableInclude,
    });
    await recordAudit({
      action: 'TIMETABLE_CREATE',
      entityType: 'Timetable',
      entityId: String(created.id),
      ...auditActor({ adminId: admin.id }),
      ipAddress: getIp(requestMeta),
      metadata: { classOfferingId: created.classOfferingId, termScopeKey: scope },
    });
    return toTimetable(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(
        'A timetable already exists for this class and term scope',
        'TIMETABLE_SCOPE_CONFLICT'
      );
    }
    throw error;
  }
}

async function updateTimetable(id, payload, admin, requestMeta = {}) {
  await findTimetableOrThrow(id);
  const updated = await prisma.timetable.update({
    where: { id },
    data: {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
    },
    include: timetableInclude,
  });
  await recordAudit({
    action: 'TIMETABLE_UPDATE',
    entityType: 'Timetable',
    entityId: String(id),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  return toTimetable(updated);
}

async function setTimetablePublication(id, isPublished, admin, requestMeta = {}) {
  await findTimetableOrThrow(id);
  const updated = await prisma.timetable.update({
    where: { id },
    data: {
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
    include: timetableInclude,
  });
  await recordAudit({
    action: isPublished ? 'TIMETABLE_PUBLISH' : 'TIMETABLE_UNPUBLISH',
    entityType: 'Timetable',
    entityId: String(id),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  const result = toTimetable(updated);
  if (isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyTimetablePublished(result);
  }
  return result;
}

async function softDeleteTimetable(id, admin, requestMeta = {}) {
  await findTimetableOrThrow(id);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.timetableEntry.updateMany({
      where: { timetableId: id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return tx.timetable.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false, publishedAt: null },
      include: timetableInclude,
    });
  });
  await recordAudit({
    action: 'TIMETABLE_DELETE',
    entityType: 'Timetable',
    entityId: String(id),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  return toTimetable(updated);
}

async function createEntry(timetableId, payload, admin, requestMeta = {}) {
  const timetable = await findTimetableOrThrow(timetableId);
  assertValidTimeRange(payload.startTime, payload.endTime);
  if (!WEEKDAYS.includes(payload.dayOfWeek)) {
    throw validationFailure('Invalid dayOfWeek', 'dayOfWeek');
  }
  await findSubjectOrThrow(payload.subjectId);
  await assertTeacherEligible({
    teacherId: payload.teacherId,
    classOfferingId: timetable.classOfferingId,
    subjectId: payload.subjectId,
    academicTermId: timetable.academicTermId,
  });
  await assertClassroom(payload.classroomId ?? null);

  await assertNoConflicts({
    timetableId,
    classOfferingId: timetable.classOfferingId,
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    teacherId: payload.teacherId,
    classroomId: payload.classroomId ?? null,
  });

  const created = await prisma.timetableEntry.create({
    data: {
      timetableId,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      subjectId: payload.subjectId,
      teacherId: payload.teacherId,
      classroomId: payload.classroomId ?? null,
      isActive: payload.isActive !== false,
      notes: payload.notes ?? null,
    },
    include: entryInclude,
  });
  await recordAudit({
    action: 'TIMETABLE_ENTRY_CREATE',
    entityType: 'TimetableEntry',
    entityId: String(created.id),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
    metadata: { timetableId },
  });
  return toEntry(created);
}

async function updateEntry(entryId, payload, admin, requestMeta = {}) {
  const existing = await findEntryOrThrow(entryId);
  const timetable = existing.timetable;

  const next = {
    dayOfWeek: payload.dayOfWeek ?? existing.dayOfWeek,
    startTime: payload.startTime ?? existing.startTime,
    endTime: payload.endTime ?? existing.endTime,
    subjectId: payload.subjectId ?? existing.subjectId,
    teacherId: payload.teacherId ?? existing.teacherId,
    classroomId:
      payload.classroomId !== undefined ? payload.classroomId : existing.classroomId,
    isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
    notes: payload.notes !== undefined ? payload.notes : existing.notes,
  };

  assertValidTimeRange(next.startTime, next.endTime);
  if (!WEEKDAYS.includes(next.dayOfWeek)) {
    throw validationFailure('Invalid dayOfWeek', 'dayOfWeek');
  }
  await findSubjectOrThrow(next.subjectId);
  await assertTeacherEligible({
    teacherId: next.teacherId,
    classOfferingId: timetable.classOfferingId,
    subjectId: next.subjectId,
    academicTermId: timetable.academicTermId,
  });
  await assertClassroom(next.classroomId);

  if (next.isActive) {
    await assertNoConflicts({
      timetableId: timetable.id,
      classOfferingId: timetable.classOfferingId,
      dayOfWeek: next.dayOfWeek,
      startTime: next.startTime,
      endTime: next.endTime,
      teacherId: next.teacherId,
      classroomId: next.classroomId,
      excludeEntryId: entryId,
    });
  }

  const updated = await prisma.timetableEntry.update({
    where: { id: entryId },
    data: next,
    include: entryInclude,
  });
  await recordAudit({
    action: 'TIMETABLE_ENTRY_UPDATE',
    entityType: 'TimetableEntry',
    entityId: String(entryId),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  const result = toEntry(updated);
  if (timetable.isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyTimetableChanged(
      {
        id: timetable.id,
        classOfferingId: timetable.classOfferingId,
        isPublished: timetable.isPublished,
      },
      entryId
    );
  }
  return result;
}

async function softDeleteEntry(entryId, admin, requestMeta = {}) {
  const existing = await findEntryOrThrow(entryId);
  const updated = await prisma.timetableEntry.update({
    where: { id: entryId },
    data: { deletedAt: new Date(), isActive: false },
    include: entryInclude,
  });
  await recordAudit({
    action: 'TIMETABLE_ENTRY_DELETE',
    entityType: 'TimetableEntry',
    entityId: String(entryId),
    ...auditActor({ adminId: admin.id }),
    ipAddress: getIp(requestMeta),
  });
  const result = toEntry(updated);
  if (existing.timetable?.isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyTimetableEntryCancelled(
      {
        id: existing.timetable.id,
        classOfferingId: existing.timetable.classOfferingId,
        isPublished: existing.timetable.isPublished,
      },
      entryId
    );
  }
  return result;
}

async function checkConflicts(query) {
  assertValidTimeRange(query.startTime, query.endTime);
  const timetable = await findTimetableOrThrow(query.timetableId);
  return {
    conflicts: await detectConflicts({
      timetableId: timetable.id,
      classOfferingId: timetable.classOfferingId,
      dayOfWeek: query.dayOfWeek,
      startTime: query.startTime,
      endTime: query.endTime,
      teacherId: query.teacherId,
      classroomId: query.classroomId ?? null,
      excludeEntryId: query.excludeEntryId ?? null,
    }),
  };
}

/** Teacher view: all published active entries for this teacher. */
async function listEntriesForTeacher(teacherId, { dayOfWeek } = {}) {
  const entries = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      deletedAt: null,
      isActive: true,
      ...(dayOfWeek ? { dayOfWeek } : {}),
      timetable: { deletedAt: null, isPublished: true },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: {
      ...entryInclude,
      timetable: {
        include: {
          classOffering: {
            select: {
              ...classRefSelect,
              name: true,
              gradeLevel: { select: { id: true, name: true, code: true } },
              section: { select: { id: true, name: true, code: true } },
            },
          },
          academicYear: { select: { id: true, name: true, code: true } },
          academicTerm: { select: { id: true, name: true, sequence: true } },
        },
      },
    },
  });

  return {
    items: entries.map((row) => ({
      ...toEntry(row),
      timetable: {
        id: row.timetable.id,
        title: row.timetable.title,
        isPublished: row.timetable.isPublished,
        classOffering: row.timetable.classOffering,
        academicYear: row.timetable.academicYear,
        academicTerm: row.timetable.academicTerm,
      },
    })),
  };
}

/** Student view: published timetable for active enrollment. */
async function listTimetablesForStudent(studentId) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      deletedAt: null,
      classOffering: { deletedAt: null },
    },
    select: { classOfferingId: true },
  });
  const classIds = enrollments.map((e) => e.classOfferingId);
  if (!classIds.length) {
    return { items: [] };
  }

  const rows = await prisma.timetable.findMany({
    where: {
      classOfferingId: { in: classIds },
      deletedAt: null,
      isPublished: true,
    },
    include: timetableInclude,
    orderBy: [{ id: 'desc' }],
  });

  return { items: rows.map((row) => toTimetable(row)) };
}

module.exports = {
  WEEKDAYS,
  listClassrooms,
  createClassroom,
  updateClassroom,
  softDeleteClassroom,
  listTimetables,
  getTimetableById,
  createTimetable,
  updateTimetable,
  setTimetablePublication,
  softDeleteTimetable,
  createEntry,
  updateEntry,
  softDeleteEntry,
  checkConflicts,
  listEntriesForTeacher,
  listTimetablesForStudent,
};
