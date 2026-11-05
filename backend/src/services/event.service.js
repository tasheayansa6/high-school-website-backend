const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const slugify = require('../utils/slugify');
const { toFeaturedImagePayload } = require('../utils/mediaUrl');
const { recordAudit } = require('./audit.service');

const EVENT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
});

const mediaSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  altText: true,
};

const createdBySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

const eventInclude = {
  featuredImage: { select: mediaSelect },
  createdBy: { select: createdBySelect },
};

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toPublicEvent(event) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    publishedAt: event.publishedAt,
    updatedAt: event.updatedAt,
    featuredImage: toFeaturedImagePayload(event.featuredImage),
  };
}

function toAdminEvent(event) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    publishedAt: event.publishedAt,
    deletedAt: event.deletedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    createdById: event.createdById,
    featuredImageId: event.featuredImageId,
    featuredImage: toFeaturedImagePayload(event.featuredImage),
    createdBy: event.createdBy
      ? {
          id: event.createdBy.id,
          firstName: event.createdBy.firstName,
          lastName: event.createdBy.lastName,
          email: event.createdBy.email,
        }
      : null,
  };
}

function resolveSlug({ title, slug }) {
  const value = slugify(slug || title);
  if (!value) {
    throw new AppError('A valid event slug is required.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'slug', message: 'slug could not be generated' }],
    });
  }
  return value;
}

function parseDateOrThrow(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}.`, 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field, message: 'must be a valid ISO-8601 date-time' }],
    });
  }
  return date;
}

function assertEndNotBeforeStart(startsAt, endsAt) {
  if (!endsAt) return;
  if (endsAt.getTime() < startsAt.getTime()) {
    throw new AppError('endsAt must not be earlier than startsAt.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'endsAt', message: 'endsAt must not be earlier than startsAt' }],
    });
  }
}

async function assertUniqueEventSlug(slug, excludeId = null) {
  const existing = await prisma.event.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('An event with this slug already exists.', 409, {
      code: 'EVENT_SLUG_CONFLICT',
    });
  }
}

async function assertActiveMedia(featuredImageId) {
  if (featuredImageId == null) {
    return null;
  }

  const media = await prisma.mediaAsset.findFirst({
    where: notDeleted({ id: featuredImageId }),
    select: { id: true },
  });

  if (!media) {
    throw new AppError('Featured image media asset not found.', 404, {
      code: 'MEDIA_NOT_FOUND',
    });
  }

  return media.id;
}

async function findEventOrThrow(id, { includeDeleted = false } = {}) {
  const event = await prisma.event.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
    include: eventInclude,
  });

  if (!event) {
    throw new AppError('Event not found.', 404, {
      code: 'EVENT_NOT_FOUND',
    });
  }

  return event;
}

function applyTimeframeFilter(where, { timeframe, startsFrom, startsTo } = {}) {
  const now = new Date();
  const startsAtFilter = { ...(where.startsAt || {}) };

  if (timeframe === 'upcoming') {
    startsAtFilter.gte = now;
  } else if (timeframe === 'past') {
    startsAtFilter.lt = now;
  }

  if (startsFrom) {
    startsAtFilter.gte = parseDateOrThrow(startsFrom, 'startsFrom');
  }

  if (startsTo) {
    startsAtFilter.lte = parseDateOrThrow(startsTo, 'startsTo');
  }

  if (Object.keys(startsAtFilter).length > 0) {
    where.startsAt = startsAtFilter;
  }
}

async function listPublicEvents({
  page = 1,
  limit = 20,
  q,
  timeframe,
  startsFrom,
  startsTo,
} = {}) {
  const where = notDeleted({
    status: EVENT_STATUS.PUBLISHED,
  });

  if (q) {
    where.OR = [{ title: { contains: q } }, { slug: { contains: q } }];
  }

  applyTimeframeFilter(where, { timeframe, startsFrom, startsTo });

  const orderBy =
    timeframe === 'past'
      ? [{ startsAt: 'desc' }, { id: 'desc' }]
      : [{ startsAt: 'asc' }, { id: 'asc' }];

  const [total, items] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        featuredImage: { select: mediaSelect },
      },
    }),
  ]);

  return {
    items: items.map(toPublicEvent),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getPublicEventBySlug(slug) {
  const event = await prisma.event.findFirst({
    where: notDeleted({
      slug,
      status: EVENT_STATUS.PUBLISHED,
    }),
    include: {
      featuredImage: { select: mediaSelect },
    },
  });

  if (!event) {
    throw new AppError('Event not found.', 404, {
      code: 'EVENT_NOT_FOUND',
    });
  }

  return toPublicEvent(event);
}

async function listAdminEvents({
  page = 1,
  limit = 20,
  q,
  status,
  timeframe,
  startsFrom,
  startsTo,
  sortBy = 'startsAt',
  sortOrder = 'asc',
  includeDeleted = false,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [{ title: { contains: q } }, { slug: { contains: q } }];
  }

  applyTimeframeFilter(where, { timeframe, startsFrom, startsTo });

  const orderField = ['startsAt', 'createdAt', 'updatedAt', 'publishedAt', 'title'].includes(
    sortBy
  )
    ? sortBy
    : 'startsAt';
  const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, items] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: [{ [orderField]: orderDirection }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: eventInclude,
    }),
  ]);

  return {
    items: items.map(toAdminEvent),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getAdminEventById(id, { includeDeleted = false } = {}) {
  const event = await findEventOrThrow(id, { includeDeleted });
  return toAdminEvent(event);
}

async function createEvent(payload, admin, requestMeta = {}) {
  const title = payload.title.trim();
  const resolvedSlug = resolveSlug({ title, slug: payload.slug });
  await assertUniqueEventSlug(resolvedSlug);

  const startsAt = parseDateOrThrow(payload.startsAt, 'startsAt');
  const endsAt =
    payload.endsAt == null || payload.endsAt === ''
      ? null
      : parseDateOrThrow(payload.endsAt, 'endsAt');
  assertEndNotBeforeStart(startsAt, endsAt);

  const featuredImageId = await assertActiveMedia(
    payload.featuredImageId === undefined ? null : payload.featuredImageId
  );

  try {
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          title,
          slug: resolvedSlug,
          description: payload.description.trim(),
          location: payload.location || null,
          startsAt,
          endsAt,
          status: EVENT_STATUS.DRAFT,
          createdById: admin.id,
          featuredImageId,
        },
        include: eventInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'events.create',
        entityType: 'Event',
        entityId: created.id,
        metadata: { title: created.title, slug: created.slug },
        ipAddress: requestMeta.ipAddress,
      });

      return created;
    });

    return toAdminEvent(event);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('An event with this slug already exists.', 409, {
        code: 'EVENT_SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function updateEvent(id, updates, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id);
  const data = {};

  if (typeof updates.title === 'string') {
    data.title = updates.title.trim();
  }

  if (typeof updates.description === 'string') {
    data.description = updates.description.trim();
  }

  if (typeof updates.location === 'string' || updates.location === null) {
    data.location = updates.location;
  }

  if (typeof updates.slug === 'string' && updates.slug.trim()) {
    const resolvedSlug = resolveSlug({ title: updates.slug, slug: updates.slug });
    if (resolvedSlug !== existing.slug) {
      await assertUniqueEventSlug(resolvedSlug, existing.id);
      data.slug = resolvedSlug;
    }
  }

  const nextStartsAt = Object.prototype.hasOwnProperty.call(updates, 'startsAt')
    ? parseDateOrThrow(updates.startsAt, 'startsAt')
    : existing.startsAt;

  let nextEndsAt = existing.endsAt;
  if (Object.prototype.hasOwnProperty.call(updates, 'endsAt')) {
    nextEndsAt =
      updates.endsAt == null || updates.endsAt === ''
        ? null
        : parseDateOrThrow(updates.endsAt, 'endsAt');
    data.endsAt = nextEndsAt;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'startsAt')) {
    data.startsAt = nextStartsAt;
  }

  assertEndNotBeforeStart(nextStartsAt, nextEndsAt);

  if (Object.prototype.hasOwnProperty.call(updates, 'featuredImageId')) {
    data.featuredImageId = await assertActiveMedia(updates.featuredImageId);
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id: existing.id },
        data,
        include: eventInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'events.update',
        entityType: 'Event',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates), slug: updated.slug },
        ipAddress: requestMeta.ipAddress,
      });

      return updated;
    });

    return toAdminEvent(event);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('An event with this slug already exists.', 409, {
        code: 'EVENT_SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function publishEvent(id, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id);

  if (!existing.title || !existing.title.trim()) {
    throw new AppError('Event title is required before publishing.', 422, {
      code: 'EVENT_TITLE_REQUIRED',
    });
  }

  if (!existing.description || !existing.description.trim()) {
    throw new AppError('Event description is required before publishing.', 422, {
      code: 'EVENT_DESCRIPTION_REQUIRED',
    });
  }

  if (!existing.startsAt) {
    throw new AppError('Event start date is required before publishing.', 422, {
      code: 'EVENT_STARTS_AT_REQUIRED',
    });
  }

  if (existing.status === EVENT_STATUS.CANCELLED) {
    throw new AppError(
      'Cancelled events cannot be published directly. Unpublish first to return to draft.',
      400,
      { code: 'EVENT_CANCELLED' }
    );
  }

  if (
    ![EVENT_STATUS.DRAFT, EVENT_STATUS.PUBLISHED, EVENT_STATUS.ARCHIVED].includes(
      existing.status
    )
  ) {
    throw new AppError('Invalid publication transition.', 400, {
      code: 'EVENT_INVALID_TRANSITION',
    });
  }

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: existing.id },
      data: {
        status: EVENT_STATUS.PUBLISHED,
        publishedAt: existing.publishedAt || new Date(),
      },
      include: eventInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'events.publish',
      entityType: 'Event',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminEvent(event);
}

async function unpublishEvent(id, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id);

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: existing.id },
      data: { status: EVENT_STATUS.DRAFT },
      include: eventInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'events.unpublish',
      entityType: 'Event',
      entityId: updated.id,
      metadata: { slug: updated.slug, from: existing.status },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminEvent(event);
}

async function cancelEvent(id, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id);

  if (existing.status === EVENT_STATUS.CANCELLED) {
    return toAdminEvent(existing);
  }

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: existing.id },
      data: { status: EVENT_STATUS.CANCELLED },
      include: eventInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'events.cancel',
      entityType: 'Event',
      entityId: updated.id,
      metadata: { slug: updated.slug, from: existing.status },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminEvent(event);
}

async function softDeleteEvent(id, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id);

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: EVENT_STATUS.DRAFT,
      },
      include: eventInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'events.delete',
      entityType: 'Event',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminEvent(event);
}

async function restoreEvent(id, admin, requestMeta = {}) {
  const existing = await findEventOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Event is not deleted.', 400, {
      code: 'EVENT_NOT_DELETED',
    });
  }

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: existing.id },
      data: { deletedAt: null },
      include: eventInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'events.restore',
      entityType: 'Event',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminEvent(event);
}

module.exports = {
  EVENT_STATUS,
  listPublicEvents,
  getPublicEventBySlug,
  listAdminEvents,
  getAdminEventById,
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  softDeleteEvent,
  restoreEvent,
};
