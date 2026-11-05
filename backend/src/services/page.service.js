const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const slugify = require('../utils/slugify');
const { recordAudit } = require('./audit.service');

const PUBLICATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

function toPublicPage(page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: page.content,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
  };
}

function toAdminPage(page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: page.content,
    status: page.status,
    publishedAt: page.publishedAt,
    deletedAt: page.deletedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    createdById: page.createdById,
    updatedById: page.updatedById,
    createdBy: page.createdBy
      ? {
          id: page.createdBy.id,
          firstName: page.createdBy.firstName,
          lastName: page.createdBy.lastName,
          email: page.createdBy.email,
        }
      : null,
    updatedBy: page.updatedBy
      ? {
          id: page.updatedBy.id,
          firstName: page.updatedBy.firstName,
          lastName: page.updatedBy.lastName,
          email: page.updatedBy.email,
        }
      : null,
  };
}

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function assertPublishableContent(content) {
  if (!content || !String(content).trim()) {
    throw new AppError('Page content is required before publishing.', 422, {
      code: 'PAGE_CONTENT_REQUIRED',
      errors: [{ field: 'content', message: 'content cannot be empty' }],
    });
  }
}

async function assertUniqueSlug(slug, excludeId = null) {
  const existing = await prisma.page.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, deletedAt: true },
  });

  if (existing) {
    throw new AppError('A page with this slug already exists.', 409, {
      code: 'SLUG_CONFLICT',
    });
  }
}

function resolveSlug({ title, slug }) {
  const value = slugify(slug || title);

  if (!value) {
    throw new AppError('A valid slug is required.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'slug', message: 'slug could not be generated' }],
    });
  }

  return value;
}

async function findPageOrThrow(id, { includeDeleted = false } = {}) {
  const page = await prisma.page.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!page) {
    throw new AppError('Page not found.', 404, {
      code: 'PAGE_NOT_FOUND',
    });
  }

  return page;
}

async function listPublicPages({ page = 1, limit = 20 } = {}) {
  const where = notDeleted({
    status: PUBLICATION_STATUS.PUBLISHED,
  });

  const [total, items] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items: items.map(toPublicPage),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getPublicPageBySlug(slug) {
  const page = await prisma.page.findFirst({
    where: notDeleted({
      slug,
      status: PUBLICATION_STATUS.PUBLISHED,
    }),
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!page) {
    throw new AppError('Page not found.', 404, {
      code: 'PAGE_NOT_FOUND',
    });
  }

  return toPublicPage(page);
}

async function listAdminPages({
  page = 1,
  limit = 20,
  status,
  q,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  includeDeleted = false,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const orderByField = ['createdAt', 'updatedAt', 'title', 'publishedAt'].includes(sortBy)
    ? sortBy
    : 'updatedAt';
  const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: [{ [orderByField]: orderByDirection }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  return {
    items: items.map(toAdminPage),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function searchAdminPages(params) {
  return listAdminPages(params);
}

async function getAdminPageById(id, { includeDeleted = false } = {}) {
  const page = await findPageOrThrow(id, { includeDeleted });
  return toAdminPage(page);
}

async function createPage({ title, slug, content }, admin, requestMeta = {}) {
  const resolvedSlug = resolveSlug({ title, slug });
  await assertUniqueSlug(resolvedSlug);

  try {
    const page = await prisma.page.create({
      data: {
        title: title.trim(),
        slug: resolvedSlug,
        content,
        status: PUBLICATION_STATUS.DRAFT,
        createdById: admin.id,
        updatedById: admin.id,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await recordAudit({
      adminId: admin.id,
      action: 'page.create',
      entityType: 'Page',
      entityId: page.id,
      metadata: { title: page.title, slug: page.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return toAdminPage(page);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('A page with this slug already exists.', 409, {
        code: 'SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function updatePage(id, updates, admin, requestMeta = {}) {
  const existing = await findPageOrThrow(id);
  const data = {
    updatedById: admin.id,
  };

  if (typeof updates.title === 'string') {
    data.title = updates.title.trim();
  }

  if (typeof updates.content === 'string') {
    data.content = updates.content;
  }

  if (typeof updates.slug === 'string' && updates.slug.trim()) {
    const resolvedSlug = resolveSlug({ title: updates.slug, slug: updates.slug });
    if (resolvedSlug !== existing.slug) {
      await assertUniqueSlug(resolvedSlug, existing.id);
      data.slug = resolvedSlug;
    }
  }

  try {
    const page = await prisma.page.update({
      where: { id: existing.id },
      data,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await recordAudit({
      adminId: admin.id,
      action: 'page.update',
      entityType: 'Page',
      entityId: page.id,
      metadata: {
        fields: Object.keys(updates),
        slug: page.slug,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return toAdminPage(page);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('A page with this slug already exists.', 409, {
        code: 'SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function publishPage(id, admin, requestMeta = {}) {
  const existing = await findPageOrThrow(id);
  assertPublishableContent(existing.content);

  const page = await prisma.page.update({
    where: { id: existing.id },
    data: {
      status: PUBLICATION_STATUS.PUBLISHED,
      publishedAt: existing.publishedAt || new Date(),
      updatedById: admin.id,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  await recordAudit({
    adminId: admin.id,
    action: 'page.publish',
    entityType: 'Page',
    entityId: page.id,
    metadata: { slug: page.slug },
    ipAddress: requestMeta.ipAddress,
  });

  return toAdminPage(page);
}

async function unpublishPage(id, admin, requestMeta = {}) {
  const existing = await findPageOrThrow(id);

  const page = await prisma.page.update({
    where: { id: existing.id },
    data: {
      status: PUBLICATION_STATUS.DRAFT,
      updatedById: admin.id,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  await recordAudit({
    adminId: admin.id,
    action: 'page.unpublish',
    entityType: 'Page',
    entityId: page.id,
    metadata: { slug: page.slug },
    ipAddress: requestMeta.ipAddress,
  });

  return toAdminPage(page);
}

async function softDeletePage(id, admin, requestMeta = {}) {
  const existing = await findPageOrThrow(id);

  const page = await prisma.page.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      status: PUBLICATION_STATUS.DRAFT,
      updatedById: admin.id,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  await recordAudit({
    adminId: admin.id,
    action: 'page.delete',
    entityType: 'Page',
    entityId: page.id,
    metadata: { slug: page.slug },
    ipAddress: requestMeta.ipAddress,
  });

  return toAdminPage(page);
}

async function restorePage(id, admin, requestMeta = {}) {
  const existing = await findPageOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Page is not deleted.', 400, {
      code: 'PAGE_NOT_DELETED',
    });
  }

  const page = await prisma.page.update({
    where: { id: existing.id },
    data: {
      deletedAt: null,
      updatedById: admin.id,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  await recordAudit({
    adminId: admin.id,
    action: 'page.restore',
    entityType: 'Page',
    entityId: page.id,
    metadata: { slug: page.slug },
    ipAddress: requestMeta.ipAddress,
  });

  return toAdminPage(page);
}

module.exports = {
  PUBLICATION_STATUS,
  listPublicPages,
  getPublicPageBySlug,
  listAdminPages,
  searchAdminPages,
  getAdminPageById,
  createPage,
  updatePage,
  publishPage,
  unpublishPage,
  softDeletePage,
  restorePage,
};
