const { prisma } = require('../../config/database');
const { toStudentRef } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const { buildPagination, notFound, getIp, whereWithDeleted } = require('./common');
const {
  toDateOnly,
  auditActor,
  studentRefSelect,
  classRefSelect,
  findClassOfferingOrThrow,
  assertStudentsEnrolled,
} = require('./ops.helpers');

const ATTENDANCE_NOT_FOUND = 'ATTENDANCE_NOT_FOUND';

const attendanceInclude = {
  student: { select: studentRefSelect },
  classOffering: { select: classRefSelect },
};

function toAttendance(record) {
  return {
    id: record.id,
    studentId: record.studentId,
    classOfferingId: record.classOfferingId,
    attendanceDate: record.attendanceDate,
    status: record.status,
    notes: record.notes,
    recordedById: record.recordedById,
    student: record.student ? toStudentRef(record.student) : undefined,
    classOffering: record.classOffering || undefined,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildDateFilter({ date, from, to }) {
  if (date) return toDateOnly(date);
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.gte = toDateOnly(from);
  if (to) filter.lte = toDateOnly(to);
  return filter;
}

/**
 * @param {object} query validated query
 * @param {{ classOfferingIds?: number[] }} [scope] restrict to these classes
 */
async function listAttendance(
  { page = 1, limit = 20, studentId, classOfferingId, status, date, from, to, includeDeleted = false } = {},
  scope = {}
) {
  const where = whereWithDeleted({}, includeDeleted);

  if (studentId) where.studentId = studentId;
  if (status) where.status = status;
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (scope.classOfferingIds) {
    where.classOfferingId = classOfferingId
      ? scope.classOfferingIds.includes(classOfferingId)
        ? classOfferingId
        : -1
      : { in: scope.classOfferingIds };
  }
  const dateFilter = buildDateFilter({ date, from, to });
  if (dateFilter) where.attendanceDate = dateFilter;

  const [total, items] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ attendanceDate: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: attendanceInclude,
    }),
  ]);

  return { items: items.map(toAttendance), pagination: buildPagination({ page, limit, total }) };
}

async function getAttendanceById(id, { includeDeleted = false } = {}) {
  const record = await prisma.attendanceRecord.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: attendanceInclude,
  });
  if (!record) throw notFound('Attendance record', ATTENDANCE_NOT_FOUND);
  return toAttendance(record);
}

function upsertArgs({ studentId, classOfferingId, attendanceDate, status, notes }, recordedById) {
  return {
    where: {
      studentId_classOfferingId_attendanceDate: { studentId, classOfferingId, attendanceDate },
    },
    create: {
      studentId,
      classOfferingId,
      attendanceDate,
      status,
      notes: notes ?? null,
      recordedById,
    },
    // Re-activates a previously soft-deleted record for the same key.
    update: { status, notes: notes ?? null, recordedById, deletedAt: null },
    include: attendanceInclude,
  };
}

/** Upsert by (student, class, date). `actor` is { adminId } or { teacherId }. */
async function upsertAttendance(payload, actor, requestMeta = {}) {
  await findClassOfferingOrThrow(payload.classOfferingId);
  await assertStudentsEnrolled(payload.classOfferingId, [payload.studentId]);

  const attendanceDate = toDateOnly(payload.attendanceDate);
  const recordedById = actor.teacherId || null;

  const record = await prisma.$transaction(async (tx) => {
    const saved = await tx.attendanceRecord.upsert(
      upsertArgs({ ...payload, attendanceDate }, recordedById)
    );

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'attendance.upsert',
      entityType: 'AttendanceRecord',
      entityId: saved.id,
      metadata: {
        studentId: saved.studentId,
        classOfferingId: saved.classOfferingId,
        attendanceDate: attendanceDate.toISOString().slice(0, 10),
        status: saved.status,
      },
      ipAddress: getIp(requestMeta),
    });

    return saved;
  });

  const result = toAttendance(record);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAttendanceRecorded(result);
  return result;
}

/** Mark a whole class day in one transaction. */
async function bulkUpsertAttendance({ classOfferingId, attendanceDate, records }, actor, requestMeta = {}) {
  await findClassOfferingOrThrow(classOfferingId);

  const date = toDateOnly(attendanceDate);
  // Last entry wins when a student appears more than once.
  const byStudent = new Map(records.map((row) => [row.studentId, row]));
  const rows = [...byStudent.values()];

  await assertStudentsEnrolled(classOfferingId, rows.map((row) => row.studentId), 'records');

  const recordedById = actor.teacherId || null;

  const saved = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const row of rows) {
      results.push(
        await tx.attendanceRecord.upsert(
          upsertArgs({ ...row, classOfferingId, attendanceDate: date }, recordedById)
        )
      );
    }

    const counts = {};
    for (const row of results) counts[row.status] = (counts[row.status] || 0) + 1;

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'attendance.bulk-upsert',
      entityType: 'AttendanceRecord',
      entityId: null,
      metadata: {
        classOfferingId,
        attendanceDate: date.toISOString().slice(0, 10),
        total: results.length,
        counts,
      },
      ipAddress: getIp(requestMeta),
    });

    return results;
  });

  const items = saved.map(toAttendance);
  const notificationEvents = require('./notification.events');
  for (const item of items) {
    await notificationEvents.notifyAttendanceRecorded(item);
  }
  return {
    classOfferingId,
    attendanceDate: date,
    total: saved.length,
    items,
  };
}

async function softDeleteAttendance(id, actor, requestMeta = {}, scope = {}) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(scope.classOfferingIds ? { classOfferingId: { in: scope.classOfferingIds } } : {}),
    },
  });
  if (!existing) throw notFound('Attendance record', ATTENDANCE_NOT_FOUND);

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceRecord.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: attendanceInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'attendance.delete',
      entityType: 'AttendanceRecord',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAttendance(record);
}

module.exports = {
  listAttendance,
  getAttendanceById,
  upsertAttendance,
  bulkUpsertAttendance,
  softDeleteAttendance,
};
