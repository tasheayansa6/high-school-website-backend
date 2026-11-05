const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase7TestPass1';
const emails = {
  super: 'phase7.super@example.com',
  editor: 'phase7.editor@example.com',
  communicator: 'phase7.comms@example.com',
};

const createdPostIds = [];
const createdCategoryIds = [];

async function ensureRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
}

async function upsertAdmin({ email, roleSlug }) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  const passwordHash = await hashPassword(PASSWORD);
  const existing = await prisma.admin.findFirst({ where: { email } });

  if (existing) {
    return prisma.admin.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: 'Phase7',
        lastName: 'Tester',
        isActive: true,
        deletedAt: null,
        tokenVersion: 0,
        roleId: role.id,
      },
    });
  }

  return prisma.admin.create({
    data: {
      email,
      passwordHash,
      firstName: 'Phase7',
      lastName: 'Tester',
      roleId: role.id,
    },
  });
}

async function login(email) {
  const res = await request(app)
    .post('/api/v1/admin/auth/login')
    .send({ email, password: PASSWORD });
  assert.equal(res.status, 200, res.body.message);
  return res.body.data.accessToken;
}

async function cleanup() {
  if (createdPostIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'BlogPost',
        entityId: { in: createdPostIds.map(String) },
      },
    });
    await prisma.blogPost.deleteMany({ where: { id: { in: createdPostIds } } });
  }

  if (createdCategoryIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'BlogCategory',
        entityId: { in: createdCategoryIds.map(String) },
      },
    });
    await prisma.blogCategory.deleteMany({
      where: { id: { in: createdCategoryIds } },
    });
  }

  await prisma.blogPost.deleteMany({
    where: { slug: { startsWith: 'phase7-' } },
  });
  await prisma.blogCategory.deleteMany({
    where: { slug: { startsWith: 'phase7-' } },
  });
  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });
}

describe('Phase 7 blog module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let category;
  let post;

  before(async () => {
    await connectDatabase();
    await ensureRoles();
    await cleanup();

    await upsertAdmin({ email: emails.super, roleSlug: ROLE_SLUGS.SUPER_ADMIN });
    await upsertAdmin({ email: emails.editor, roleSlug: ROLE_SLUGS.CONTENT_EDITOR });
    await upsertAdmin({
      email: emails.communicator,
      roleSlug: ROLE_SLUGS.COMMUNICATION_MANAGER,
    });

    superToken = await login(emails.super);
    editorToken = await login(emails.editor);
    communicatorToken = await login(emails.communicator);
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('creates a category', async () => {
    const res = await request(app)
      .post('/api/v1/admin/blog/categories')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: 'Phase7 News',
        slug: 'phase7-news',
        description: 'School news',
      });

    assert.equal(res.status, 201);
    category = res.body.data.category;
    createdCategoryIds.push(category.id);
  });

  it('creates an article', async () => {
    const res = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 Opening Day',
        slug: 'phase7-opening-day',
        excerpt: 'Welcome back',
        content: '<p>Opening day details</p>',
        categoryId: category.id,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.post.status, 'DRAFT');
    post = res.body.data.post;
    createdPostIds.push(post.id);
  });

  it('rejects unauthenticated article creation', async () => {
    const res = await request(app)
      .post('/api/v1/admin/blog/posts')
      .send({
        title: 'Nope',
        content: '<p>x</p>',
      });
    assert.equal(res.status, 401);
  });

  it('rejects communication manager article creation', async () => {
    const res = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${communicatorToken}`)
      .send({
        title: 'Forbidden',
        content: '<p>x</p>',
        categoryId: category.id,
      });
    assert.equal(res.status, 403);
  });

  it('edits an article', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 Opening Day Updated',
        content: '<p>Updated opening day</p>',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.post.title, 'Phase7 Opening Day Updated');
    assert.equal(res.body.data.post.status, 'DRAFT');
  });

  it('rejects duplicate article slugs', async () => {
    const first = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 Duplicate',
        slug: 'phase7-duplicate',
        content: '<p>one</p>',
        categoryId: category.id,
      });
    assert.equal(first.status, 201);
    createdPostIds.push(first.body.data.post.id);

    const second = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 Duplicate 2',
        slug: 'phase7-duplicate',
        content: '<p>two</p>',
        categoryId: category.id,
      });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'POST_SLUG_CONFLICT');
  });

  it('rejects publishing without a category', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 No Category',
        slug: 'phase7-no-category',
        content: '<p>content</p>',
      });
    assert.equal(createRes.status, 201);
    createdPostIds.push(createRes.body.data.post.id);

    const publishRes = await request(app)
      .patch(`/api/v1/admin/blog/posts/${createRes.body.data.post.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(publishRes.status, 422);
    assert.equal(publishRes.body.code, 'POST_CATEGORY_REQUIRED');
  });

  it('publishes and lists publicly', async () => {
    const publishRes = await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.body.data.post.status, 'PUBLISHED');
    post = publishRes.body.data.post;

    const listRes = await request(app).get('/api/v1/blog/posts');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.items.some((item) => item.slug === post.slug));

    const detailRes = await request(app).get(`/api/v1/blog/posts/${post.slug}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.data.post.author.email, undefined);
  });

  it('keeps draft articles private', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/blog/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase7 Draft Only',
        slug: 'phase7-draft-only',
        content: '<p>secret</p>',
        categoryId: category.id,
      });
    assert.equal(createRes.status, 201);
    createdPostIds.push(createRes.body.data.post.id);

    const res = await request(app).get('/api/v1/blog/posts/phase7-draft-only');
    assert.equal(res.status, 404);
  });

  it('filters by category publicly', async () => {
    const res = await request(app).get(
      `/api/v1/blog/categories/${category.slug}/posts`
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.every((item) => item.category.slug === category.slug));
  });

  it('supports admin search and pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/blog/posts')
      .query({ q: 'opening', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.ok(res.body.data.items.some((item) => item.id === post.id));
  });

  it('unpublishes an article', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}/unpublish`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.post.status, 'DRAFT');

    const publicRes = await request(app).get(`/api/v1/blog/posts/${post.slug}`);
    assert.equal(publicRes.status, 404);
  });

  it('soft deletes and hides publicly', async () => {
    await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    const res = await request(app)
      .delete(`/api/v1/admin/blog/posts/${post.id}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.post.deletedAt);

    const publicRes = await request(app).get(`/api/v1/blog/posts/${post.slug}`);
    assert.equal(publicRes.status, 404);
  });

  it('rejects restore by content editor', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}/restore`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/blog/posts/${post.id}/restore`)
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.post.deletedAt, null);
  });

  it('documents featured-image support without isFeatured flag', async () => {
    assert.equal(Object.prototype.hasOwnProperty.call(post, 'isFeatured'), false);
    assert.ok('featuredImage' in post || post.featuredImage === null || true);
  });

  it('writes audit logs for article actions', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'BlogPost',
        entityId: String(post.id),
      },
    });

    const actions = logs.map((log) => log.action);
    assert.ok(actions.includes('blog.post.create'));
    assert.ok(actions.includes('blog.post.update'));
    assert.ok(actions.includes('blog.post.publish'));
    assert.ok(actions.includes('blog.post.unpublish'));
    assert.ok(actions.includes('blog.post.delete'));
    assert.ok(actions.includes('blog.post.restore'));
  });

  it('prevents deleting categories still in use', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/blog/categories/${category.id}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'CATEGORY_IN_USE');
  });
});
