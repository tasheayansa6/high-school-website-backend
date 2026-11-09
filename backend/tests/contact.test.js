const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
// Force high ceiling so this suite is not blocked by dedicated rate-limit tests
// or a low CONTACT_RATE_LIMIT_MAX in the developer environment.
process.env.CONTACT_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase8TestPass1';
const emails = {
  super: 'phase8.super@example.com',
  editor: 'phase8.editor@example.com',
  communicator: 'phase8.comms@example.com',
};

const createdMessageIds = [];

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
        firstName: 'Phase8',
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
      firstName: 'Phase8',
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
  if (createdMessageIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'ContactMessage',
        entityId: { in: createdMessageIds.map(String) },
      },
    });
    await prisma.contactMessage.deleteMany({
      where: { id: { in: createdMessageIds } },
    });
  }

  await prisma.contactMessage.deleteMany({
    where: {
      email: {
        in: [
          'phase8.parent@example.com',
          'phase8.search@example.com',
          'phase8.filter@example.com',
        ],
      },
    },
  });

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });
}

describe('Phase 8 contact module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let messageId;

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

  it('accepts a valid public contact submission', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Phase8 Parent',
      email: 'phase8.parent@example.com',
      phone: '+251911000000',
      subject: 'Admissions inquiry',
      message: 'Please share enrollment details for next year.',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.submission.id);
    assert.equal(res.body.data.submission.message, undefined);
    messageId = res.body.data.submission.id;
    createdMessageIds.push(messageId);

    const saved = await prisma.contactMessage.findUnique({ where: { id: messageId } });
    assert.ok(saved);
    assert.equal(saved.status, 'NEW');
    assert.equal(saved.email, 'phase8.parent@example.com');
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/v1/contact').send({});
    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Parent',
      email: 'not-an-email',
      subject: 'Hello',
      message: 'Valid message body',
    });
    assert.equal(res.status, 422);
  });

  it('rejects empty message', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Parent',
      email: 'phase8.empty@example.com',
      subject: 'Hello',
      message: '   ',
    });
    assert.equal(res.status, 422);
  });

  it('rejects overlong name', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'A'.repeat(151),
      email: 'phase8.long@example.com',
      subject: 'Hello',
      message: 'Valid message body',
    });
    assert.equal(res.status, 422);
  });

  it('allows public submission without authentication', async () => {
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Anon Parent',
      email: 'phase8.search@example.com',
      subject: 'Searchable subject keyword',
      message: 'Looking for transport information.',
    });
    assert.equal(res.status, 201);
    createdMessageIds.push(res.body.data.submission.id);
  });

  it('rejects unauthenticated inbox access', async () => {
    const res = await request(app).get('/api/v1/admin/contact-messages');
    assert.equal(res.status, 401);
  });

  it('denies Content Editor inbox access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/contact-messages')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('lists messages for Communication Manager', async () => {
    const res = await request(app)
      .get('/api/v1/admin/contact-messages')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.ok(res.body.data.items.some((item) => item.id === messageId));
  });

  it('supports search and status filtering', async () => {
    const searchRes = await request(app)
      .get('/api/v1/admin/contact-messages')
      .query({ q: 'Searchable subject', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.data.items.length >= 1);

    const filterRes = await request(app)
      .get('/api/v1/admin/contact-messages')
      .query({ status: 'NEW', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.body.data.items.every((item) => item.status === 'NEW'));
  });

  it('retrieves a message for Super Admin', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/contact-messages/${messageId}`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.message.id, messageId);
    assert.ok(res.body.data.message.message.includes('enrollment'));
  });

  it('updates message status and records audit', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/contact-messages/${messageId}/status`)
      .set('Authorization', `Bearer ${communicatorToken}`)
      .send({ status: 'READ' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.message.status, 'READ');

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ContactMessage',
        entityId: String(messageId),
        action: 'contact.status_update',
      },
    });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].metadata.to, 'READ');
    assert.ok(!JSON.stringify(logs[0].metadata).includes('enrollment details'));
  });

  it('archives a message on delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/contact-messages/${messageId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.message.status, 'ARCHIVED');

    const detail = await request(app)
      .get(`/api/v1/admin/contact-messages/${messageId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(detail.status, 404);

    const list = await request(app)
      .get('/api/v1/admin/contact-messages')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(
      list.body.data.items.some((item) => item.id === messageId),
      false
    );

    const deleteLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ContactMessage',
        entityId: String(messageId),
        action: 'contact.delete',
      },
    });
    assert.ok(deleteLogs.length >= 1);
  });

  it('rejects restore by Communication Manager', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/contact-messages/${messageId}/restore`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores archived message as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/contact-messages/${messageId}/restore`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.message.status, 'NEW');

    const restoreLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ContactMessage',
        entityId: String(messageId),
        action: 'contact.restore',
      },
    });
    assert.ok(restoreLogs.length >= 1);
  });

  it('keeps status update and audit consistent via transaction', async () => {
    const before = await prisma.contactMessage.findUnique({ where: { id: messageId } });
    const auditCountBefore = await prisma.auditLog.count({
      where: {
        entityType: 'ContactMessage',
        entityId: String(messageId),
        action: 'contact.status_update',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/contact-messages/${messageId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'REPLIED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.message.status, 'REPLIED');
    assert.notEqual(before.status, 'REPLIED');

    const auditCountAfter = await prisma.auditLog.count({
      where: {
        entityType: 'ContactMessage',
        entityId: String(messageId),
        action: 'contact.status_update',
      },
    });
    assert.equal(auditCountAfter, auditCountBefore + 1);
  });
});
