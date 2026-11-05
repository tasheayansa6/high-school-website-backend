const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const slugify = require('../utils/slugify');
const { toFeaturedImagePayload } = require('../utils/mediaUrl');
const { recordAudit } = require('./audit.service');

const POST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

const authorPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
};

const authorAdminSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
};

const mediaSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  altText: true,
};

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toPublicPost(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author
      ? {
          id: post.author.id,
          firstName: post.author.firstName,
          lastName: post.author.lastName,
        }
      : null,
    category: post.category
      ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
        }
      : null,
    featuredImage: toFeaturedImagePayload(post.featuredImage),
  };
}

function toAdminPost(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt,
    deletedAt: post.deletedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorId: post.authorId,
    categoryId: post.categoryId,
    featuredImageId: post.featuredImageId,
    author: post.author
      ? {
          id: post.author.id,
          firstName: post.author.firstName,
          lastName: post.author.lastName,
          email: post.author.email,
        }
      : null,
    category: post.category
      ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
          description: post.category.description,
        }
      : null,
    featuredImage: toFeaturedImagePayload(post.featuredImage),
  };
}

const postIncludePublic = {
  author: { select: authorPublicSelect },
  category: { select: categorySelect },
  featuredImage: { select: mediaSelect },
};

const postIncludeAdmin = {
  author: { select: authorAdminSelect },
  category: { select: categorySelect },
  featuredImage: { select: mediaSelect },
};

function resolveSlug({ title, slug }) {
  const value = slugify(slug || title);
  if (!value) {
    throw new AppError('A valid article slug is required.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'slug', message: 'slug could not be generated' }],
    });
  }
  return value;
}

function assertPublishableContent(content) {
  if (!content || !String(content).trim()) {
    throw new AppError('Article content is required before publishing.', 422, {
      code: 'POST_CONTENT_REQUIRED',
      errors: [{ field: 'content', message: 'content cannot be empty' }],
    });
  }
}

async function assertUniquePostSlug(slug, excludeId = null) {
  const existing = await prisma.blogPost.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('An article with this slug already exists.', 409, {
      code: 'POST_SLUG_CONFLICT',
    });
  }
}

async function assertActiveCategory(categoryId) {
  if (categoryId == null) {
    return null;
  }

  const category = await prisma.blogCategory.findFirst({
    where: notDeleted({ id: categoryId }),
    select: { id: true },
  });

  if (!category) {
    throw new AppError('Category not found.', 404, {
      code: 'CATEGORY_NOT_FOUND',
    });
  }

  return category.id;
}

async function assertActiveAuthor(authorId) {
  const author = await prisma.admin.findFirst({
    where: notDeleted({ id: authorId, isActive: true }),
    select: { id: true },
  });

  if (!author) {
    throw new AppError('Author administrator not found or inactive.', 400, {
      code: 'AUTHOR_INVALID',
    });
  }

  return author.id;
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

async function findPostOrThrow(id, { includeDeleted = false } = {}) {
  const post = await prisma.blogPost.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
    include: postIncludeAdmin,
  });

  if (!post) {
    throw new AppError('Article not found.', 404, {
      code: 'POST_NOT_FOUND',
    });
  }

  return post;
}

function buildPublicWhere({ q, categoryId, categorySlug } = {}) {
  const where = notDeleted({
    status: POST_STATUS.PUBLISHED,
  });

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (categorySlug) {
    where.category = notDeleted({ slug: categorySlug });
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
      { excerpt: { contains: q } },
    ];
  }

  return where;
}

async function listPublicPosts({
  page = 1,
  limit = 20,
  q,
  categoryId,
  categorySlug,
} = {}) {
  const where = buildPublicWhere({ q, categoryId, categorySlug });

  const [total, items] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: postIncludePublic,
    }),
  ]);

  return {
    items: items.map(toPublicPost),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getPublicPostBySlug(slug) {
  const post = await prisma.blogPost.findFirst({
    where: notDeleted({
      slug,
      status: POST_STATUS.PUBLISHED,
    }),
    include: postIncludePublic,
  });

  if (!post) {
    throw new AppError('Article not found.', 404, {
      code: 'POST_NOT_FOUND',
    });
  }

  return toPublicPost(post);
}

async function listAdminPosts({
  page = 1,
  limit = 20,
  q,
  status,
  categoryId,
  authorId,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  includeDeleted = false,
  publishedFrom,
  publishedTo,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (authorId) where.authorId = authorId;

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
      { excerpt: { contains: q } },
    ];
  }

  if (publishedFrom || publishedTo) {
    where.publishedAt = {};
    if (publishedFrom) where.publishedAt.gte = new Date(publishedFrom);
    if (publishedTo) where.publishedAt.lte = new Date(publishedTo);
  }

  const orderField = ['createdAt', 'updatedAt', 'publishedAt', 'title'].includes(sortBy)
    ? sortBy
    : 'updatedAt';
  const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ [orderField]: orderDirection }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: postIncludeAdmin,
    }),
  ]);

  return {
    items: items.map(toAdminPost),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getAdminPostById(id, { includeDeleted = false } = {}) {
  const post = await findPostOrThrow(id, { includeDeleted });
  return toAdminPost(post);
}

async function createPost(payload, admin, requestMeta = {}) {
  const title = payload.title.trim();
  const resolvedSlug = resolveSlug({ title, slug: payload.slug });
  await assertUniquePostSlug(resolvedSlug);

  const authorId = await assertActiveAuthor(payload.authorId || admin.id);
  const categoryId = await assertActiveCategory(
    payload.categoryId === undefined ? null : payload.categoryId
  );
  const featuredImageId = await assertActiveMedia(
    payload.featuredImageId === undefined ? null : payload.featuredImageId
  );

  try {
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.blogPost.create({
        data: {
          title,
          slug: resolvedSlug,
          excerpt: payload.excerpt || null,
          content: payload.content,
          status: POST_STATUS.DRAFT,
          authorId,
          categoryId,
          featuredImageId,
        },
        include: postIncludeAdmin,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'blog.post.create',
        entityType: 'BlogPost',
        entityId: created.id,
        metadata: { title: created.title, slug: created.slug },
        ipAddress: requestMeta.ipAddress,
      });

      return created;
    });

    return toAdminPost(post);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('An article with this slug already exists.', 409, {
        code: 'POST_SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function updatePost(id, updates, admin, requestMeta = {}) {
  const existing = await findPostOrThrow(id);
  const data = {};

  if (typeof updates.title === 'string') {
    data.title = updates.title.trim();
  }

  if (typeof updates.content === 'string') {
    data.content = updates.content;
  }

  if (typeof updates.excerpt === 'string' || updates.excerpt === null) {
    data.excerpt = updates.excerpt;
  }

  if (typeof updates.slug === 'string' && updates.slug.trim()) {
    const resolvedSlug = resolveSlug({ title: updates.slug, slug: updates.slug });
    if (resolvedSlug !== existing.slug) {
      await assertUniquePostSlug(resolvedSlug, existing.id);
      data.slug = resolvedSlug;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'categoryId')) {
    data.categoryId = await assertActiveCategory(updates.categoryId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'featuredImageId')) {
    data.featuredImageId = await assertActiveMedia(updates.featuredImageId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'authorId')) {
    data.authorId = await assertActiveAuthor(updates.authorId);
  }

  try {
    const post = await prisma.$transaction(async (tx) => {
      const updated = await tx.blogPost.update({
        where: { id: existing.id },
        data,
        include: postIncludeAdmin,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'blog.post.update',
        entityType: 'BlogPost',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates), slug: updated.slug },
        ipAddress: requestMeta.ipAddress,
      });

      return updated;
    });

    return toAdminPost(post);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('An article with this slug already exists.', 409, {
        code: 'POST_SLUG_CONFLICT',
      });
    }
    throw error;
  }
}

async function publishPost(id, admin, requestMeta = {}) {
  const existing = await findPostOrThrow(id);

  if (!existing.title || !existing.title.trim()) {
    throw new AppError('Article title is required before publishing.', 422, {
      code: 'POST_TITLE_REQUIRED',
    });
  }

  assertPublishableContent(existing.content);

  if (!existing.categoryId) {
    throw new AppError('A category is required before publishing.', 422, {
      code: 'POST_CATEGORY_REQUIRED',
      errors: [{ field: 'categoryId', message: 'categoryId is required to publish' }],
    });
  }

  await assertActiveCategory(existing.categoryId);
  await assertActiveAuthor(existing.authorId);

  const post = await prisma.$transaction(async (tx) => {
    const updated = await tx.blogPost.update({
      where: { id: existing.id },
      data: {
        status: POST_STATUS.PUBLISHED,
        publishedAt: existing.publishedAt || new Date(),
      },
      include: postIncludeAdmin,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.post.publish',
      entityType: 'BlogPost',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminPost(post);
}

async function unpublishPost(id, admin, requestMeta = {}) {
  const existing = await findPostOrThrow(id);

  const post = await prisma.$transaction(async (tx) => {
    const updated = await tx.blogPost.update({
      where: { id: existing.id },
      data: { status: POST_STATUS.DRAFT },
      include: postIncludeAdmin,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.post.unpublish',
      entityType: 'BlogPost',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminPost(post);
}

async function softDeletePost(id, admin, requestMeta = {}) {
  const existing = await findPostOrThrow(id);

  const post = await prisma.$transaction(async (tx) => {
    const updated = await tx.blogPost.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: POST_STATUS.DRAFT,
      },
      include: postIncludeAdmin,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.post.delete',
      entityType: 'BlogPost',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminPost(post);
}

async function restorePost(id, admin, requestMeta = {}) {
  const existing = await findPostOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Article is not deleted.', 400, {
      code: 'POST_NOT_DELETED',
    });
  }

  const post = await prisma.$transaction(async (tx) => {
    const updated = await tx.blogPost.update({
      where: { id: existing.id },
      data: { deletedAt: null },
      include: postIncludeAdmin,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'blog.post.restore',
      entityType: 'BlogPost',
      entityId: updated.id,
      metadata: { slug: updated.slug },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminPost(post);
}

module.exports = {
  POST_STATUS,
  listPublicPosts,
  getPublicPostBySlug,
  listAdminPosts,
  getAdminPostById,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  softDeletePost,
  restorePost,
};
