const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const env = require('../src/config/env');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const { notDeleted } = require('../src/utils/softDelete');

const PASSWORD = 'Phase5TestPass1';
const emails = {
  super: 'phase5.super@example.com',
  editor: 'phase5.editor@example.com',
  disabled: 'phase5.disabled@example.com',
  deleted: 'phase5.deleted@example.com',
};

async function ensureRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
}

async function upsertAdmin({ email, roleSlug, isActive = true, deletedAt = null }) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  assert.ok(role, `role ${roleSlug} missing`);

  const passwordHash = await hashPassword(PASSWORD);
  const existing = await prisma.admin.findFirst({
    where: { email },
  });

  if (existing) {
    return prisma.admin.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: 'Phase5',
        lastName: 'Tester',
        isActive,
        deletedAt,
        tokenVersion: 0,
        roleId: role.id,
      },
      include: { role: true },
    });
  }

  return prisma.admin.create({
    data: {
      email,
      passwordHash,
      firstName: 'Phase5',
      lastName: 'Tester',
      isActive,
      deletedAt,
      roleId: role.id,
    },
    include: { role: true },
  });
}

async function cleanup() {
  await prisma.admin.deleteMany({
    where: {
      email: { in: Object.values(emails) },
    },
  });
}

describe('Phase 5 administrator authentication', () => {
  let superAdmin;
  let editorAdmin;
  let accessToken;

  before(async () => {
    await connectDatabase();
    await ensureRoles();
    await cleanup();

    superAdmin = await upsertAdmin({
      email: emails.super,
      roleSlug: ROLE_SLUGS.SUPER_ADMIN,
    });
    editorAdmin = await upsertAdmin({
      email: emails.editor,
      roleSlug: ROLE_SLUGS.CONTENT_EDITOR,
    });
    await upsertAdmin({
      email: emails.disabled,
      roleSlug: ROLE_SLUGS.CONTENT_EDITOR,
      isActive: false,
    });
    await upsertAdmin({
      email: emails.deleted,
      roleSlug: ROLE_SLUGS.CONTENT_EDITOR,
      deletedAt: new Date(),
    });
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('logs in successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.super, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.tokenType, 'Bearer');
    assert.equal(res.body.data.admin.email, emails.super);
    assert.equal(res.body.data.admin.role.slug, ROLE_SLUGS.SUPER_ADMIN);
    assert.equal(res.body.data.admin.passwordHash, undefined);
    accessToken = res.body.data.accessToken;
  });

  it('rejects incorrect password with a generic message', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.super, password: 'WrongPassword1' });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  it('rejects unknown email with a generic message', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'missing.phase5@example.com', password: PASSWORD });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  it('rejects missing login fields', async () => {
    const res = await request(app).post('/api/v1/admin/auth/login').send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
  });

  it('rejects expired JWT', async () => {
    const expiredToken = jwt.sign(
      { sub: superAdmin.id, tokenVersion: 0 },
      env.jwt.secret,
      {
        expiresIn: '-1s',
        issuer: env.jwt.issuer,
        audience: env.jwt.audience,
      }
    );

    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_EXPIRED');
  });

  it('rejects invalid JWT', async () => {
    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_INVALID');
  });

  it('rejects protected routes without authentication', async () => {
    const res = await request(app).get('/api/v1/admin/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('allows protected routes with a valid token', async () => {
    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.admin.email, emails.super);
    assert.deepEqual(res.body.data.admin.permissions, ['*']);
  });

  it('rejects disabled administrator login', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.disabled, password: PASSWORD });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  it('rejects deleted administrator login', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.deleted, password: PASSWORD });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  it('rejects access without the required role/permission', async () => {
    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.editor, password: PASSWORD });

    assert.equal(loginRes.status, 200);
    const editorToken = loginRes.body.data.accessToken;

    const denied = await request(app)
      .get('/api/v1/admin/access/settings')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, 'FORBIDDEN');

    const allowed = await request(app)
      .get('/api/v1/admin/access/content')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(allowed.status, 200);
  });

  it('revokes tokens on logout', async () => {
    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: emails.editor, password: PASSWORD });

    const token = loginRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/admin/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(logoutRes.status, 200);

    const meRes = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 401);
    assert.equal(meRes.body.code, 'TOKEN_REVOKED');
  });

  it('keeps Super Admin role available for controlled bootstrap', async () => {
    const role = await prisma.role.findUnique({
      where: { slug: ROLE_SLUGS.SUPER_ADMIN },
    });
    assert.ok(role);
    assert.equal(superAdmin.role.slug, ROLE_SLUGS.SUPER_ADMIN);

    const duplicateGuard = await prisma.admin.findFirst({
      where: notDeleted({ email: emails.super }),
    });
    assert.equal(duplicateGuard.id, superAdmin.id);
  });
});
