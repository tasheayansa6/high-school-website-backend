const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase13TestPass1';
const emails = {
  super: 'phase13.super@example.com',
  editor: 'phase13.editor@example.com',
  communicator: 'phase13.comms@example.com',
};

const TEST_KEYS = [
  'school.name',
  'school.tagline',
  'contact.email',
  'contact.phone',
  'website.logoUrl',
  'internal.adminNotes',
  'admissions.inquiryEmail',
];

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
        firstName: 'Phase13',
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
      firstName: 'Phase13',
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
  const existing = await prisma.websiteSetting.findMany({
    where: { key: { in: TEST_KEYS } },
    select: { id: true },
  });
  const ids = existing.map((row) => row.id);

  if (ids.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'WebsiteSetting',
        entityId: { in: ids.map(String) },
      },
    });
    await prisma.websiteSetting.deleteMany({
      where: { id: { in: ids } },
    });
  }

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });
}

describe('Phase 13 website settings module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;

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

  it('returns public settings without authentication', async () => {
    const res = await request(app).get('/api/v1/settings/public');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.settings);
    assert.equal(typeof res.body.data.settings, 'object');
  });

  it('rejects unauthenticated admin settings access', async () => {
    const res = await request(app).get('/api/v1/admin/settings');
    assert.equal(res.status, 401);
  });

  it('denies Content Editor settings management', async () => {
    const res = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('denies Communication Manager settings management', async () => {
    const res = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('allows Super Admin to create settings via PUT', async () => {
    const res = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        settings: {
          'school.name': 'Phase13 High School',
          'school.tagline': 'Learning together',
          'contact.email': 'phase13.info@example.com',
          'contact.phone': '+251 911 000 111',
          'website.logoUrl': 'https://cdn.example.com/logo.png',
          'internal.adminNotes': 'Do not show publicly',
          'admissions.inquiryEmail': 'phase13.admissions@example.com',
        },
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length >= 6);

    const name = await prisma.websiteSetting.findUnique({ where: { key: 'school.name' } });
    assert.equal(name.value, 'Phase13 High School');

    const createLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'WebsiteSetting',
        action: 'settings.create',
        entityId: String(name.id),
      },
    });
    assert.ok(createLogs.length >= 1);
    assert.equal(createLogs[0].metadata.key, 'school.name');
    assert.ok(!JSON.stringify(createLogs[0].metadata).includes('Phase13 High School'));
  });

  it('excludes sensitive/internal settings from public responses', async () => {
    const res = await request(app).get('/api/v1/settings/public');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.settings['school.name'], 'Phase13 High School');
    assert.equal(res.body.data.settings['contact.email'], 'phase13.info@example.com');
    assert.equal(res.body.data.settings['internal.adminNotes'], undefined);
    assert.ok(!JSON.stringify(res.body).includes('Do not show publicly'));
  });

  it('lists admin settings and supports group filtering', async () => {
    const all = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(all.status, 200);
    assert.ok(all.body.data.items.some((item) => item.key === 'internal.adminNotes'));

    const contact = await request(app)
      .get('/api/v1/admin/settings')
      .query({ group: 'contact' })
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(contact.status, 200);
    assert.ok(contact.body.data.items.length >= 1);
    assert.ok(contact.body.data.items.every((item) => item.group === 'contact'));
  });

  it('retrieves a single setting for Super Admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/settings/school.name')
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.setting.key, 'school.name');
    assert.equal(res.body.data.setting.isPublic, true);
  });

  it('updates a setting via PATCH and records audit', async () => {
    const before = await prisma.websiteSetting.findUnique({ where: { key: 'school.tagline' } });
    const auditBefore = await prisma.auditLog.count({
      where: {
        entityType: 'WebsiteSetting',
        entityId: String(before.id),
        action: 'settings.update',
      },
    });

    const res = await request(app)
      .patch('/api/v1/admin/settings/school.tagline')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ value: 'Updated tagline' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.setting.value, 'Updated tagline');

    const auditAfter = await prisma.auditLog.count({
      where: {
        entityType: 'WebsiteSetting',
        entityId: String(before.id),
        action: 'settings.update',
      },
    });
    assert.equal(auditAfter, auditBefore + 1);
  });

  it('rejects invalid email values', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/settings/contact.email')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ value: 'not-an-email' });
    assert.equal(res.status, 422);
  });

  it('rejects invalid URL values', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/settings/website.logoUrl')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ value: 'ftp://example.com/logo.png' });
    assert.equal(res.status, 422);
  });

  it('rejects unknown setting keys', async () => {
    const res = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        settings: {
          'smtp.password': 'secret',
        },
      });
    assert.equal(res.status, 422);
  });

  it('rejects unknown fields on update body', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/settings/school.tagline')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ value: 'ok', secret: 'nope' });
    assert.equal(res.status, 422);
  });

  it('returns 404 for missing allowlisted settings', async () => {
    await prisma.websiteSetting.deleteMany({ where: { key: 'admissions.inquiryPhone' } });
    const res = await request(app)
      .get('/api/v1/admin/settings/admissions.inquiryPhone')
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'SETTING_NOT_FOUND');
  });

  it('handles duplicate keys by updating the same row', async () => {
    const firstCount = await prisma.websiteSetting.count({
      where: { key: 'school.name' },
    });
    assert.equal(firstCount, 1);

    const res = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        settings: {
          'school.name': 'Phase13 High School Renamed',
        },
      });

    assert.equal(res.status, 200);
    const secondCount = await prisma.websiteSetting.count({
      where: { key: 'school.name' },
    });
    assert.equal(secondCount, 1);

    const row = await prisma.websiteSetting.findUnique({ where: { key: 'school.name' } });
    assert.equal(row.value, 'Phase13 High School Renamed');
  });

  it('keeps multi-setting updates and audits consistent via transaction', async () => {
    const auditBefore = await prisma.auditLog.count({
      where: { entityType: 'WebsiteSetting', action: 'settings.update' },
    });

    const res = await request(app)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        settings: {
          'contact.phone': '+251 911 222 333',
          'admissions.inquiryEmail': 'phase13.admissions2@example.com',
        },
      });

    assert.equal(res.status, 200);

    const phone = await prisma.websiteSetting.findUnique({ where: { key: 'contact.phone' } });
    const admissions = await prisma.websiteSetting.findUnique({
      where: { key: 'admissions.inquiryEmail' },
    });
    assert.equal(phone.value, '+251 911 222 333');
    assert.equal(admissions.value, 'phase13.admissions2@example.com');

    const auditAfter = await prisma.auditLog.count({
      where: { entityType: 'WebsiteSetting', action: 'settings.update' },
    });
    assert.equal(auditAfter, auditBefore + 2);
  });

  it('deletes a deletable setting and records audit', async () => {
    const existing = await prisma.websiteSetting.findUnique({
      where: { key: 'school.tagline' },
    });
    assert.ok(existing);

    const res = await request(app)
      .delete('/api/v1/admin/settings/school.tagline')
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 200);

    const missing = await prisma.websiteSetting.findUnique({
      where: { key: 'school.tagline' },
    });
    assert.equal(missing, null);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'WebsiteSetting',
        entityId: String(existing.id),
        action: 'settings.delete',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('prevents deleting non-deletable settings', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/settings/school.name')
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'SETTING_NOT_DELETABLE');
  });

  it('does not persist invalid updates (database remains unchanged)', async () => {
    const before = await prisma.websiteSetting.findUnique({
      where: { key: 'contact.email' },
    });

    const res = await request(app)
      .patch('/api/v1/admin/settings/contact.email')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ value: 'still-bad' });

    assert.equal(res.status, 422);

    const after = await prisma.websiteSetting.findUnique({
      where: { key: 'contact.email' },
    });
    assert.equal(after.value, before.value);
  });
});
