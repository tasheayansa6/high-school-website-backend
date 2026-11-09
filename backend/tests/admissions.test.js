const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
// Force high ceiling so this suite is not blocked by dedicated rate-limit tests
// or a low ADMISSIONS_RATE_LIMIT_MAX in the developer environment.
process.env.ADMISSIONS_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase10TestPass1';
const emails = {
  super: 'phase10.super@example.com',
  editor: 'phase10.editor@example.com',
  communicator: 'phase10.comms@example.com',
};

const validInquiry = {
  studentName: 'Abebe Kebede',
  guardianName: 'Kebede Alemu',
  email: 'phase10.parent@example.com',
  phone: '+251 911 000 111',
  gradeApplyingFor: 'Grade 9',
  academicYear: '2026/2027',
  message: 'Please share admission requirements for Grade 9.',
};

const createdInquiryIds = [];

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
        firstName: 'Phase10',
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
      firstName: 'Phase10',
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
  if (createdInquiryIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: { in: createdInquiryIds.map(String) },
      },
    });
    await prisma.admissionInquiry.deleteMany({
      where: { id: { in: createdInquiryIds } },
    });
  }

  await prisma.admissionInquiry.deleteMany({
    where: {
      email: {
        in: [
          'phase10.parent@example.com',
          'phase10.search@example.com',
          'phase10.filter@example.com',
          'phase10.grade10@example.com',
        ],
      },
    },
  });

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });

  createdInquiryIds.length = 0;
}

describe('Phase 10 admissions module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let inquiryId;

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

  it('accepts a valid public admissions inquiry', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send(validInquiry);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.submission.id);
    assert.equal(res.body.data.submission.status, 'NEW');
    assert.equal(res.body.data.submission.message, undefined);
    assert.equal(res.body.data.submission.phone, undefined);
    inquiryId = res.body.data.submission.id;
    createdInquiryIds.push(inquiryId);

    const saved = await prisma.admissionInquiry.findUnique({ where: { id: inquiryId } });
    assert.ok(saved);
    assert.equal(saved.status, 'NEW');
    assert.equal(saved.email, 'phase10.parent@example.com');
    assert.equal(saved.studentName, 'Abebe Kebede');
    assert.equal(saved.gradeApplyingFor, 'Grade 9');
    assert.equal(saved.academicYear, '2026/2027');
    assert.equal(saved.deletedAt, null);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/v1/admissions/inquiries').send({});
    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({ ...validInquiry, email: 'not-an-email' });
    assert.equal(res.status, 422);
  });

  it('rejects invalid phone format', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({ ...validInquiry, email: 'phase10.badphone@example.com', phone: 'abc' });
    assert.equal(res.status, 422);
  });

  it('rejects phone with too few digits', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({ ...validInquiry, email: 'phase10.shortphone@example.com', phone: '12345' });
    assert.equal(res.status, 422);
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({ ...validInquiry, email: 'phase10.empty@example.com', message: '   ' });
    assert.equal(res.status, 422);
  });

  it('rejects overlong student name', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({
        ...validInquiry,
        email: 'phase10.long@example.com',
        studentName: 'A'.repeat(151),
      });
    assert.equal(res.status, 422);
  });

  it('rejects unsupported fields', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/inquiries')
      .send({
        ...validInquiry,
        email: 'phase10.extra@example.com',
        decision: 'ACCEPT',
      });
    assert.equal(res.status, 422);
  });

  it('allows public submission without authentication', async () => {
    const res = await request(app).post('/api/v1/admissions/inquiries').send({
      studentName: 'Sara Hailu',
      email: 'phase10.search@example.com',
      phone: '+1 (415) 555-0199',
      gradeApplyingFor: 'Grade 10',
      academicYear: '2026/2027',
      message: 'Looking for boarding options.',
    });
    assert.equal(res.status, 201);
    createdInquiryIds.push(res.body.data.submission.id);
  });

  it('rejects unauthenticated administrator access', async () => {
    const res = await request(app).get('/api/v1/admin/admissions/inquiries');
    assert.equal(res.status, 401);
  });

  it('denies Content Editor admissions access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('lists inquiries for Communication Manager with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .query({ page: 1, limit: 2, sortOrder: 'desc' })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.limit, 2);
    assert.ok(res.body.data.items.length <= 2);
    assert.ok(res.body.data.items.some((item) => item.id === inquiryId));
  });

  it('supports search and status filtering', async () => {
    const searchRes = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .query({ q: 'Sara Hailu', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.data.items.some((item) => item.email === 'phase10.search@example.com'));

    const filterRes = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .query({ status: 'NEW', page: 1, limit: 50 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.body.data.items.every((item) => item.status === 'NEW'));
  });

  it('supports grade and academic year filtering', async () => {
    const gradeRes = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .query({ gradeApplyingFor: 'Grade 10', page: 1, limit: 20 })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(gradeRes.status, 200);
    assert.ok(gradeRes.body.data.items.length >= 1);
    assert.ok(gradeRes.body.data.items.every((item) => item.gradeApplyingFor === 'Grade 10'));

    const yearRes = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .query({ academicYear: '2026/2027', page: 1, limit: 50 })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(yearRes.status, 200);
    assert.ok(yearRes.body.data.items.every((item) => item.academicYear === '2026/2027'));
  });

  it('retrieves inquiry details for Super Admin', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/admissions/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.inquiry.id, inquiryId);
    assert.ok(res.body.data.inquiry.message.includes('admission requirements'));
    assert.equal(res.body.data.inquiry.phone, '+251 911 000 111');
  });

  it('updates inquiry status and records audit', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/admissions/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${communicatorToken}`)
      .send({ status: 'CONTACTED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.inquiry.status, 'CONTACTED');

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: String(inquiryId),
        action: 'admissions.status_update',
      },
    });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].metadata.to, 'CONTACTED');
    assert.ok(!JSON.stringify(logs[0].metadata).includes('admission requirements'));
  });

  it('soft-deletes an inquiry and records audit', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/admissions/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.inquiry.deletedAt);

    const detail = await request(app)
      .get(`/api/v1/admin/admissions/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(detail.status, 404);

    const list = await request(app)
      .get('/api/v1/admin/admissions/inquiries')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(
      list.body.data.items.some((item) => item.id === inquiryId),
      false
    );

    const deleteLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: String(inquiryId),
        action: 'admissions.delete',
      },
    });
    assert.ok(deleteLogs.length >= 1);
  });

  it('rejects restore by Communication Manager', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/admissions/inquiries/${inquiryId}/restore`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores a soft-deleted inquiry as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/admissions/inquiries/${inquiryId}/restore`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.inquiry.deletedAt, null);

    const restoreLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: String(inquiryId),
        action: 'admissions.restore',
      },
    });
    assert.ok(restoreLogs.length >= 1);
  });

  it('keeps status update and audit consistent via transaction', async () => {
    const before = await prisma.admissionInquiry.findUnique({ where: { id: inquiryId } });
    const auditCountBefore = await prisma.auditLog.count({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: String(inquiryId),
        action: 'admissions.status_update',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/admissions/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'UNDER_REVIEW' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.inquiry.status, 'UNDER_REVIEW');
    assert.notEqual(before.status, 'UNDER_REVIEW');

    const auditCountAfter = await prisma.auditLog.count({
      where: {
        entityType: 'AdmissionInquiry',
        entityId: String(inquiryId),
        action: 'admissions.status_update',
      },
    });
    assert.equal(auditCountAfter, auditCountBefore + 1);
  });
});
