const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const slugify = require('../utils/slugify');
const { recordAudit } = require('./audit.service');

function toPublicCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

function toAdminCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    deletedAt: category.deletedAt,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    postCount: category._count?.posts,
  };
}

function resolveSlug({ name, slug }) {
  const value = slugify(slug || name);
  if (!value) {
    throw new AppError('A valid category slug is required.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'slug', message: 'slug could not be generated' }],
    });
  }
  return value.slice(0, 150);
}

async function assertUniqueCategorySlug(slug, excludeId = null) {
  const existing = await prisma.blogCategory.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('A category with this slug already exists.', 409, {
      code: 'CATEGORY_SLUG_CONFLICT',
    });
  }
}

async function assertUniqueCategoryName(name, excludeId = null) {
  const existing = await prisma.blogCategory.findFirst({
    where: notDeleted({
      name,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    }),
    select: { id: true },
  });

  if (existing) {
    throw new AppError('A category with this name already exists.', 409, {
      code: 'CATEGORY_NAME_CONFLICT',
    });
  }
}

async function findCategoryOrThrow(id, { includeDeleted = false } = {}) {
  const category = await prisma.blogCategory.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
    include: {
      _count: {
        select: {
          posts: {
            where: notDeleted({}),
          },
        },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found.', 404, {
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return category;
}

async function listPublicCategories() {
  const categories = await prisma.blogCategory.findMany({
    where: notDeleted({}),
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  return categories.map(toPublicCategory);
}

async function getPublicCategoryBySlug(slug) {
  const category = await prisma.blogCategory.findFirst({
    where: notDeleted({ slug }),
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  if (!category) {
    throw new AppError('Category not found.', 404, {
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return toPublicCategory(category);
}

async function listAdminCategories({ q, includeDeleted = false } = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const categories = await prisma.blogCategory.findMany({
    where,
    orderBy: [{ name: 'asc' }],
    include: {
      _count: {
        select: {
          posts: {
            where: notDeleted({}),
          },
        },
      },
    },
  });

  return categories.map(toAdminCategory);
}

async function createCategory({ name, slug, description }, admin, requestMeta = {}) {
  const trimmedName = name.trim();
  const resolvedSlug = resolveSlug({ name: trimmedName, slug });

  await assertUniqueCategoryName(trimmedName);
  await assertUniqueSlugSafe(resolvedSlug);

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.blogCategory.create({
        data: {
          name: trimmedName,
          slug: resolvedSlug,
          description: description || null,
        },
        include: {
          _count: {
            select: {
              posts: {
                where: notDeleted({}),
              },
            },
          },
        },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'blog.category.create',
        entityType: 'BlogCategory',
        entityId: created.id,
        metadata: { name: created.name, slug: created.slug },
        ipAddress: requestMeta.ipAddress,
      });

      return created;
    });

    return toAdminCategory(category);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('A category with this slug already exists.', 409, {
        code: 'CATEGORY_SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function assertUniqueSlugSafe(slug, excludeId = null) {
  return assertUniqueCategorySlug(slug, excludeId);
}

async function updateCategory(id, updates, admin, requestMeta = {}) {
  const existing = await findCategoryOrThrow(id);
  const data = {};

  if (typeof updates.name === 'string') {
    const trimmedName = updates.name.trim();
    await assertUniqueCategoryName(trimmedName, existing.id);
    data.name = trimmedName;
  }

  if (typeof updates.description === 'string' || updates.description === null) {
    data.description = updates.description;
  }

  if (typeof updates.slug === 'string' && updates.slug.trim()) {
    const resolvedSlug = resolveSlug({ name: updates.slug, slug: updates.slug });
    if (resolvedSlug !== existing.slug) {
      await assertUniqueCategorySlug(resolvedSlug, existing.id);
      data.slug = resolvedSlug;
    }
  }

  const category = await prisma.$transaction(async (tx) => {
    const updated = await tx.blogCategory.update({
      where: { id: existing.id },
      data,
      include: {
        _count: {
          select: {
            posts: {
              where: notDeleted({}),
            },
          },
        },
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.category.update',
      entityType: 'BlogCategory',
      entityId: updated.id,
      metadata: { fields: Object.keys(updates), slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminCategory(category);
}

async function softDeleteCategory(id, admin, requestMeta = {}) {
  const existing = await findCategoryOrThrow(id);

  if (existing._count.posts > 0) {
    throw new AppError(
      'Cannot delete a category that still has active articles. Reassign or delete those articles first.',
      409,
      { code: 'CATEGORY_IN_USE' }
    );
  }

  const category = await prisma.$transaction(async (tx) => {
    const deleted = await tx.blogCategory.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: {
        _count: {
          select: {
            posts: {
              where: notDeleted({}),
            },
          },
        },
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.category.delete',
      entityType: 'BlogCategory',
      entityId: deleted.id,
      metadata: { slug: deleted.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return deleted;
  });

  return toAdminCategory(category);
}

module.exports = {
  listPublicCategories,
  getPublicCategoryBySlug,
  listAdminCategories,
  createCategory,
  updateCategory,
  softDeleteCategory,
  findCategoryOrThrow,
  toPublicCategory,
};
