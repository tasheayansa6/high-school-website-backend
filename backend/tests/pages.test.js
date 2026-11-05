const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase6TestPass1';
const emails = {
  super: 'phase6.super@example.com',
  editor: 'phase6.editor@example.com',
  communicator: 'phase6.comms@example.com',
};

const createdPageIds = [];

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
        firstName: 'Phase6',
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
      firstName: 'Phase6',
      lastName: 'Tester',
      isActive: true,
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
  if (createdPageIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'Page',
        entityId: { in: createdPageIds.map(String) },
      },
    });
    await prisma.page.deleteMany({
      where: { id: { in: createdPageIds } },
    });
  }

  await prisma.page.deleteMany({
    where: {
      slug: {
        in: [
          'phase6-about',
          'phase6-history',
          'phase6-admissions',
          'phase6-duplicate',
          'phase6-search-target',
          'phase6-empty-publish',
        ],
      },
    },
  });

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });
}

describe('Phase 6 pages module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let publishedPage;
  let draftPage;

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

  it('creates a page as an authorized administrator', async () => {
    const res = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 About',
        slug: 'phase6-about',
        content: '<p>About content</p>',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.page.status, 'DRAFT');
    assert.equal(res.body.data.page.slug, 'phase6-about');
    publishedPage = res.body.data.page;
    createdPageIds.push(publishedPage.id);
  });

  it('rejects unauthenticated page creation', async () => {
    const res = await request(app)
      .post('/api/v1/admin/pages')
      .send({
        title: 'Nope',
        content: '<p>x</p>',
      });

    assert.equal(res.status, 401);
  });

  it('rejects administrators without pages permission', async () => {
    const res = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${communicatorToken}`)
      .send({
        title: 'Forbidden Page',
        content: '<p>x</p>',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('updates a page successfully', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 About Updated',
        content: '<p>Updated about content</p>',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page.title, 'Phase6 About Updated');
    assert.equal(res.body.data.page.status, 'DRAFT');
  });

  it('rejects duplicate slugs', async () => {
    const first = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 Duplicate',
        slug: 'phase6-duplicate',
        content: '<p>one</p>',
      });

    assert.equal(first.status, 201);
    createdPageIds.push(first.body.data.page.id);

    const second = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 Duplicate Again',
        slug: 'phase6-duplicate',
        content: '<p>two</p>',
      });

    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'SLUG_CONFLICT');
  });

  it('rejects publishing an incomplete page', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 Empty Publish',
        slug: 'phase6-empty-publish',
        content: '<p>temp</p>',
      });

    assert.equal(createRes.status, 201);
    const emptyId = createRes.body.data.page.id;
    createdPageIds.push(emptyId);

    await prisma.page.update({
      where: { id: emptyId },
      data: { content: '   ' },
    });

    const publishRes = await request(app)
      .patch(`/api/v1/admin/pages/${emptyId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(publishRes.status, 422);
    assert.equal(publishRes.body.code, 'PAGE_CONTENT_REQUIRED');
  });

  it('publishes a valid page', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page.status, 'PUBLISHED');
    assert.ok(res.body.data.page.publishedAt);
    publishedPage = res.body.data.page;
  });

  it('lists published pages publicly', async () => {
    const res = await request(app).get('/api/v1/pages');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(
      res.body.data.items.some((page) => page.slug === 'phase6-about')
    );
    assert.equal(
      res.body.data.items.every((page) => !('status' in page)),
      true
    );
  });

  it('retrieves a published page by slug publicly', async () => {
    const res = await request(app).get('/api/v1/pages/phase6-about');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page.slug, 'phase6-about');
  });

  it('hides unpublished pages from the public API', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 History',
        slug: 'phase6-history',
        content: '<p>History draft</p>',
      });

    assert.equal(createRes.status, 201);
    draftPage = createRes.body.data.page;
    createdPageIds.push(draftPage.id);

    const res = await request(app).get('/api/v1/pages/phase6-history');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'PAGE_NOT_FOUND');
  });

  it('unpublishes a page and hides it publicly', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}/unpublish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page.status, 'DRAFT');

    const publicRes = await request(app).get('/api/v1/pages/phase6-about');
    assert.equal(publicRes.status, 404);
  });

  it('supports admin search and pagination', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase6 Search Target Admissions',
        slug: 'phase6-search-target',
        content: '<p>Searchable</p>',
      });

    assert.equal(createRes.status, 201);
    createdPageIds.push(createRes.body.data.page.id);

    const res = await request(app)
      .get('/api/v1/admin/pages/search')
      .query({ q: 'admissions', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.ok(
      res.body.data.items.some((page) => page.slug === 'phase6-search-target')
    );
  });

  it('soft deletes a page and hides it publicly', async () => {
    await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    const res = await request(app)
      .delete(`/api/v1/admin/pages/${publishedPage.id}`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.page.deletedAt);

    const publicRes = await request(app).get('/api/v1/pages/phase6-about');
    assert.equal(publicRes.status, 404);
  });

  it('rejects restoration by content editor', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}/restore`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 403);
  });

  it('restores a page as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/pages/${publishedPage.id}/restore`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page.deletedAt, null);
  });

  it('creates audit logs for page actions', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Page',
        entityId: String(publishedPage.id),
      },
      orderBy: { createdAt: 'asc' },
    });

    const actions = logs.map((log) => log.action);
    assert.ok(actions.includes('page.create'));
    assert.ok(actions.includes('page.update'));
    assert.ok(actions.includes('page.publish'));
    assert.ok(actions.includes('page.unpublish'));
    assert.ok(actions.includes('page.delete'));
    assert.ok(actions.includes('page.restore'));
    assert.ok(logs.every((log) => log.adminId != null));
    assert.ok(
      logs.every((log) => {
        const meta = log.metadata || {};
        return !JSON.stringify(meta).includes('<p>Updated about content</p>');
      })
    );
  });
});
