const crypto = require('crypto');
const { prisma } = require('../../config/database');
const {
  buildPagination,
  notFound,
  validationFailure,
  whereWithDeleted,
} = require('./common');

const NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND';

const CATEGORIES = Object.freeze([
  'ACADEMIC',
  'ATTENDANCE',
  'TIMETABLE',
  'LEARNING_MATERIAL',
  'ANNOUNCEMENT',
  'ADMINISTRATION',
  'MESSAGING',
]);

function recipientScopeKey(type, id) {
  return `${type}:${id}`;
}

function recipientWhere(type, id) {
  if (type === 'ADMIN') return { recipientType: 'ADMIN', adminId: id };
  if (type === 'TEACHER') return { recipientType: 'TEACHER', teacherId: id };
  if (type === 'STUDENT') return { recipientType: 'STUDENT', studentId: id };
  throw validationFailure('Invalid recipient type', 'recipientType');
}

function toNotification(row) {
  return {
    id: row.id,
    recipientType: row.recipientType,
    adminId: row.adminId,
    teacherId: row.teacherId,
    studentId: row.studentId,
    title: row.title,
    message: row.message,
    category: row.category,
    dedupeKey: row.dedupeKey,
    entityType: row.entityType,
    entityId: row.entityId,
    actionPath: row.actionPath,
    isRead: row.isRead,
    readAt: row.readAt,
    archivedAt: row.archivedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildRecipientFields(type, id) {
  const scope = recipientScopeKey(type, id);
  if (type === 'ADMIN') {
    return { recipientType: 'ADMIN', recipientScopeKey: scope, adminId: id, teacherId: null, studentId: null };
  }
  if (type === 'TEACHER') {
    return { recipientType: 'TEACHER', recipientScopeKey: scope, adminId: null, teacherId: id, studentId: null };
  }
  return { recipientType: 'STUDENT', recipientScopeKey: scope, adminId: null, teacherId: null, studentId: id };
}

async function filterActiveRecipientIds(type, ids) {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (!unique.length) return [];

  if (type === 'ADMIN') {
    const rows = await prisma.admin.findMany({
      where: { id: { in: unique }, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  if (type === 'TEACHER') {
    const rows = await prisma.teacher.findMany({
      where: { id: { in: unique }, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.student.findMany({
    where: { id: { in: unique }, deletedAt: null, isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Bulk-create notifications after a successful business operation.
 * Uses skipDuplicates on (recipientScopeKey, dedupeKey) for idempotency.
 *
 * @param {{
 *   recipientType: 'ADMIN'|'TEACHER'|'STUDENT',
 *   recipientIds: number[],
 *   title: string,
 *   message: string,
 *   category: string,
 *   dedupeKey: string,
 *   entityType?: string|null,
 *   entityId?: string|number|null,
 *   actionPath?: string|null,
 * }} payload
 */
async function createForRecipients(payload) {
  const {
    recipientType,
    recipientIds,
    title,
    message,
    category,
    dedupeKey,
    entityType = null,
    entityId = null,
    actionPath = null,
  } = payload;

  if (!CATEGORIES.includes(category)) {
    throw validationFailure('Invalid notification category', 'category');
  }
  if (!dedupeKey || typeof dedupeKey !== 'string') {
    throw validationFailure('dedupeKey is required', 'dedupeKey');
  }

  const activeIds = await filterActiveRecipientIds(recipientType, recipientIds || []);
  if (!activeIds.length) return { created: 0, recipientIds: [] };

  const data = activeIds.map((id) => ({
    ...buildRecipientFields(recipientType, id),
    title: String(title).slice(0, 255),
    message: String(message).slice(0, 1000),
    category,
    dedupeKey: dedupeKey.slice(0, 191),
    entityType: entityType ? String(entityType).slice(0, 100) : null,
    entityId: entityId != null ? String(entityId).slice(0, 100) : null,
    actionPath: actionPath ? String(actionPath).slice(0, 500) : null,
  }));

  const result = await prisma.notification.createMany({
    data,
    skipDuplicates: true,
  });

  return { created: result.count, recipientIds: activeIds };
}

/** Create a single non-deduped notification (unique random dedupe key). */
async function createOne(payload) {
  const dedupeKey = payload.dedupeKey || `once:${crypto.randomUUID()}`;
  return createForRecipients({ ...payload, recipientIds: [payload.recipientId], dedupeKey });
}

async function listForRecipient(
  type,
  id,
  {
    page = 1,
    limit = 20,
    category,
    isRead,
    includeArchived = false,
    includeDeleted = false,
    from,
    to,
  } = {}
) {
  const where = {
    ...recipientWhere(type, id),
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(includeArchived ? {} : { archivedAt: null }),
  };
  if (category) where.category = category;
  if (isRead !== undefined) where.isRead = isRead;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
        end.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = end;
    }
  }

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toNotification),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function unreadCount(type, id) {
  const count = await prisma.notification.count({
    where: {
      ...recipientWhere(type, id),
      deletedAt: null,
      archivedAt: null,
      isRead: false,
    },
  });
  return { unreadCount: count };
}

async function getOwnedOrThrow(type, id, notificationId) {
  const row = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      ...recipientWhere(type, id),
      deletedAt: null,
    },
  });
  if (!row) throw notFound('Notification', NOTIFICATION_NOT_FOUND);
  return row;
}

async function getById(type, id, notificationId) {
  return toNotification(await getOwnedOrThrow(type, id, notificationId));
}

async function markRead(type, id, notificationId) {
  await getOwnedOrThrow(type, id, notificationId);
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
  return toNotification(updated);
}

async function markAllRead(type, id) {
  const result = await prisma.notification.updateMany({
    where: {
      ...recipientWhere(type, id),
      deletedAt: null,
      archivedAt: null,
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

async function archive(type, id, notificationId) {
  await getOwnedOrThrow(type, id, notificationId);
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { archivedAt: new Date(), isRead: true, readAt: new Date() },
  });
  return toNotification(updated);
}

async function softDelete(type, id, notificationId) {
  await getOwnedOrThrow(type, id, notificationId);
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { deletedAt: new Date() },
  });
  return toNotification(updated);
}

async function listActiveAdminIds() {
  const rows = await prisma.admin.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function listActiveStudentIdsInClass(classOfferingId) {
  const rows = await prisma.enrollment.findMany({
    where: {
      classOfferingId,
      status: 'ACTIVE',
      deletedAt: null,
      student: { deletedAt: null, isActive: true },
    },
    select: { studentId: true },
  });
  return [...new Set(rows.map((r) => r.studentId))];
}

async function listActiveTeacherIdsForClass(classOfferingId) {
  const rows = await prisma.teachingAssignment.findMany({
    where: {
      classOfferingId,
      deletedAt: null,
      teacher: { deletedAt: null, isActive: true },
    },
    select: { teacherId: true },
  });
  return [...new Set(rows.map((r) => r.teacherId))];
}

module.exports = {
  CATEGORIES,
  recipientScopeKey,
  createForRecipients,
  createOne,
  listForRecipient,
  unreadCount,
  getById,
  markRead,
  markAllRead,
  archive,
  softDelete,
  listActiveAdminIds,
  listActiveStudentIdsInClass,
  listActiveTeacherIdsForClass,
  toNotification,
  whereWithDeleted,
};
