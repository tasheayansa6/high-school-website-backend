const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');

const SAFE_METADATA_KEYS = new Set([
  'key',
  'group',
  'slug',
  'fields',
  'from',
  'to',
  'title',
  'subject',
  'previousStatus',
  'status',
  'gradeApplyingFor',
  'academicYear',
  'mimeType',
  'fileSize',
  'originalName',
]);

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function parseOptionalDate(value, field) {
  if (value == null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}.`, 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field, message: 'must be a valid ISO-8601 date-time' }],
    });
  }
  return date;
}

function buildCreatedAtFilter({ from, to } = {}) {
  const fromDate = parseOptionalDate(from, 'from');
  const toDate = parseOptionalDate(to, 'to');

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new AppError('from must not be later than to.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'from', message: 'from must not be later than to' }],
    });
  }

  if (!fromDate && !toDate) {
    return undefined;
  }

  const createdAt = {};
  if (fromDate) createdAt.gte = fromDate;
  if (toDate) createdAt.lte = toDate;
  return createdAt;
}

function statusCountsFromGroupBy(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

function sanitizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      safe[key] = value;
    }
  }

  return Object.keys(safe).length > 0 ? safe : null;
}

async function getOverview() {
  const now = new Date();

  const [
    publishedPages,
    draftPages,
    publishedBlogPosts,
    draftBlogPosts,
    totalContactMessages,
    newContactMessages,
    totalNewsletterSubscribers,
    activeNewsletterSubscribers,
    pendingNewsletterSubscribers,
    totalAdmissionInquiries,
    newAdmissionInquiries,
    upcomingPublishedEvents,
    totalMediaAssets,
  ] = await Promise.all([
    prisma.page.count({ where: notDeleted({ status: 'PUBLISHED' }) }),
    prisma.page.count({ where: notDeleted({ status: 'DRAFT' }) }),
    prisma.blogPost.count({ where: notDeleted({ status: 'PUBLISHED' }) }),
    prisma.blogPost.count({ where: notDeleted({ status: 'DRAFT' }) }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.newsletterSubscriber.count({ where: notDeleted({}) }),
    prisma.newsletterSubscriber.count({ where: notDeleted({ status: 'ACTIVE' }) }),
    prisma.newsletterSubscriber.count({ where: notDeleted({ status: 'PENDING' }) }),
    prisma.admissionInquiry.count({ where: notDeleted({}) }),
    prisma.admissionInquiry.count({ where: notDeleted({ status: 'NEW' }) }),
    prisma.event.count({
      where: notDeleted({
        status: 'PUBLISHED',
        startsAt: { gte: now },
      }),
    }),
    prisma.mediaAsset.count({ where: notDeleted({}) }),
  ]);

  return {
    pages: {
      published: publishedPages,
      draft: draftPages,
    },
    blogPosts: {
      published: publishedBlogPosts,
      draft: draftBlogPosts,
    },
    contactMessages: {
      total: totalContactMessages,
      new: newContactMessages,
    },
    newsletterSubscribers: {
      total: totalNewsletterSubscribers,
      active: activeNewsletterSubscribers,
      pending: pendingNewsletterSubscribers,
    },
    admissionInquiries: {
      total: totalAdmissionInquiries,
      new: newAdmissionInquiries,
    },
    events: {
      upcomingPublished: upcomingPublishedEvents,
    },
    mediaAssets: {
      total: totalMediaAssets,
    },
  };
}

async function getRecentActivity({ page = 1, limit = 20 } = {}) {
  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: sanitizeAuditMetadata(row.metadata),
      createdAt: row.createdAt,
      admin: row.admin
        ? {
            id: row.admin.id,
            firstName: row.admin.firstName,
            lastName: row.admin.lastName,
            email: row.admin.email,
          }
        : null,
    })),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getContentStatistics() {
  const [pageStatuses, blogStatuses, eventStatuses, categoryCount] = await Promise.all([
    prisma.page.groupBy({
      by: ['status'],
      where: notDeleted({}),
      _count: { _all: true },
    }),
    prisma.blogPost.groupBy({
      by: ['status'],
      where: notDeleted({}),
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ['status'],
      where: notDeleted({}),
      _count: { _all: true },
    }),
    prisma.blogCategory.count({ where: notDeleted({}) }),
  ]);

  return {
    pages: {
      byStatus: statusCountsFromGroupBy(pageStatuses),
      total: pageStatuses.reduce((sum, row) => sum + row._count._all, 0),
    },
    blogPosts: {
      byStatus: statusCountsFromGroupBy(blogStatuses),
      total: blogStatuses.reduce((sum, row) => sum + row._count._all, 0),
    },
    blogCategories: {
      total: categoryCount,
    },
    events: {
      byStatus: statusCountsFromGroupBy(eventStatuses),
      total: eventStatuses.reduce((sum, row) => sum + row._count._all, 0),
    },
  };
}

async function getInquiryStatistics({ from, to } = {}) {
  const createdAt = buildCreatedAtFilter({ from, to });
  const contactWhere = createdAt ? { createdAt } : {};
  const admissionsWhere = createdAt ? notDeleted({ createdAt }) : notDeleted({});

  const [contactByStatus, admissionsByStatus, contactTotal, admissionsTotal] = await Promise.all([
    prisma.contactMessage.groupBy({
      by: ['status'],
      where: contactWhere,
      _count: { _all: true },
    }),
    prisma.admissionInquiry.groupBy({
      by: ['status'],
      where: admissionsWhere,
      _count: { _all: true },
    }),
    prisma.contactMessage.count({ where: contactWhere }),
    prisma.admissionInquiry.count({ where: admissionsWhere }),
  ]);

  return {
    filters: {
      from: createdAt?.gte || null,
      to: createdAt?.lte || null,
    },
    contactMessages: {
      total: contactTotal,
      byStatus: statusCountsFromGroupBy(contactByStatus),
    },
    admissionInquiries: {
      total: admissionsTotal,
      byStatus: statusCountsFromGroupBy(admissionsByStatus),
    },
  };
}

module.exports = {
  getOverview,
  getRecentActivity,
  getContentStatistics,
  getInquiryStatistics,
  sanitizeAuditMetadata,
};
