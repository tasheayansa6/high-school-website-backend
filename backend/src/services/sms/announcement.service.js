const { prisma } = require('../../config/database');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');
const { auditActor, classRefSelect, findClassOfferingOrThrow } = require('./ops.helpers');

const ANNOUNCEMENT_NOT_FOUND = 'ANNOUNCEMENT_NOT_FOUND';

const announcementInclude = {
  classOffering: { select: classRefSelect },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

function toAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    classOfferingId: row.classOfferingId,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt,
    createdById: row.createdById,
    classOffering: row.classOffering || undefined,
    createdBy: row.createdBy || undefined,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function findAnnouncementOrThrow(id, { includeDeleted = false } = {}) {
  const row = await prisma.announcement.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: announcementInclude,
  });
  if (!row) throw notFound('Announcement', ANNOUNCEMENT_NOT_FOUND);
  return row;
}

/** CLASS audience requires a class offering; other audiences must not have one. */
async function resolveAudienceTarget(audience, classOfferingId) {
  if (audience === 'CLASS') {
    if (!classOfferingId) {
      throw validationFailure('classOfferingId is required when audience is CLASS', 'classOfferingId');
    }
    await findClassOfferingOrThrow(classOfferingId);
    return classOfferingId;
  }
  if (classOfferingId) {
    throw validationFailure('classOfferingId is only allowed when audience is CLASS', 'classOfferingId');
  }
  return null;
}

async function listAnnouncements(
  { page = 1, limit = 20, q, audience, classOfferingId, isPublished, includeDeleted = false } = {}
) {
  const where = whereWithDeleted({}, includeDeleted);
  if (audience) where.audience = audience;
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (isPublished !== undefined) where.isPublished = isPublished;
  if (q) where.title = { contains: q };

  const [total, items] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: announcementInclude,
    }),
  ]);

  return { items: items.map(toAnnouncement), pagination: buildPagination({ page, limit, total }) };
}

async function getAnnouncementById(id, options = {}) {
  return toAnnouncement(await findAnnouncementOrThrow(id, options));
}

async function createAnnouncement(payload, admin, requestMeta = {}) {
  const audience = payload.audience || 'ALL';
  const classOfferingId = await resolveAudienceTarget(audience, payload.classOfferingId);
  const isPublished = payload.isPublished === true;

  const announcement = await prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({
      data: {
        title: payload.title,
        body: payload.body,
        audience,
        classOfferingId,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        createdById: admin.id,
      },
      include: announcementInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'announcements.create',
      entityType: 'Announcement',
      entityId: created.id,
      metadata: { audience, classOfferingId, isPublished },
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  return toAnnouncement(announcement);
}

async function updateAnnouncement(id, payload, admin, requestMeta = {}) {
  const existing = await findAnnouncementOrThrow(id);

  const data = {};
  if (payload.title !== undefined) data.title = payload.title;
  if (payload.body !== undefined) data.body = payload.body;

  if (payload.audience !== undefined || payload.classOfferingId !== undefined) {
    const audience = payload.audience ?? existing.audience;
    const requestedClass =
      payload.classOfferingId !== undefined
        ? payload.classOfferingId
        : audience === 'CLASS'
          ? existing.classOfferingId
          : null;
    data.audience = audience;
    data.classOfferingId = await resolveAudienceTarget(audience, requestedClass);
  }

  const announcement = await prisma.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id: existing.id },
      data,
      include: announcementInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'announcements.update',
      entityType: 'Announcement',
      entityId: updated.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAnnouncement(announcement);
}

async function publishAnnouncement(id, admin, requestMeta = {}) {
  const existing = await findAnnouncementOrThrow(id);
  if (existing.isPublished) return toAnnouncement(existing);

  const announcement = await prisma.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id: existing.id },
      data: { isPublished: true, publishedAt: new Date() },
      include: announcementInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'announcements.publish',
      entityType: 'Announcement',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toAnnouncement(announcement);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAnnouncementPublished(result);
  return result;
}

async function softDeleteAnnouncement(id, admin, requestMeta = {}) {
  const existing = await findAnnouncementOrThrow(id);

  const announcement = await prisma.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: announcementInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'announcements.delete',
      entityType: 'Announcement',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toAnnouncement(announcement);
}

/** Published announcements for a student: ALL, STUDENTS, or CLASS matching an active enrollment. */
async function listAnnouncementsForStudent(studentId, { page = 1, limit = 20 } = {}) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: 'ACTIVE', deletedAt: null, classOffering: { deletedAt: null } },
    select: { classOfferingId: true },
  });
  const classIds = enrollments.map((row) => row.classOfferingId);

  const where = {
    deletedAt: null,
    isPublished: true,
    OR: [
      { audience: { in: ['ALL', 'STUDENTS'] } },
      ...(classIds.length ? [{ audience: 'CLASS', classOfferingId: { in: classIds } }] : []),
    ],
  };

  const [total, items] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { classOffering: { select: classRefSelect } },
    }),
  ]);

  return {
    items: items.map((row) => {
      const { createdById, createdBy, ...rest } = toAnnouncement(row);
      return rest;
    }),
    pagination: buildPagination({ page, limit, total }),
  };
}

/** Published announcements for a teacher: ALL, TEACHERS, or CLASS matching a live teaching assignment. */
async function listAnnouncementsForTeacher(teacherId, { page = 1, limit = 20 } = {}) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      deletedAt: null,
      classOffering: { deletedAt: null },
    },
    select: { classOfferingId: true },
  });
  const classIds = [...new Set(assignments.map((row) => row.classOfferingId))];

  const where = {
    deletedAt: null,
    isPublished: true,
    OR: [
      { audience: { in: ['ALL', 'TEACHERS'] } },
      ...(classIds.length ? [{ audience: 'CLASS', classOfferingId: { in: classIds } }] : []),
    ],
  };

  const [total, items] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { classOffering: { select: classRefSelect } },
    }),
  ]);

  return {
    items: items.map((row) => {
      const { createdById, createdBy, ...rest } = toAnnouncement(row);
      return rest;
    }),
    pagination: buildPagination({ page, limit, total }),
  };
}

module.exports = {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  softDeleteAnnouncement,
  listAnnouncementsForStudent,
  listAnnouncementsForTeacher,
};
