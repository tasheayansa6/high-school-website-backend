const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const env = require('../src/config/env');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const { signAccessToken, signStudentAccessToken } = require('../src/utils/token');

const PASSWORD = 'SmsPhase2Teacher1';
const emails = {
  teacher: 'sms.phase2.teacher.auth@example.com',
  disabled: 'sms.phase2.teacher.auth.disabled@example.com',
  deleted: 'sms.phase2.teacher.auth.deleted@example.com',
  admin: 'sms.phase2.teacher.auth.admin@example.com',
};

async function cleanup() {
  await prisma.teacher.deleteMany({
    where: { email: { in: [emails.teacher, emails.disabled, emails.deleted] } },
  });
  await prisma.admin.deleteMany({ where: { email: emails.admin } });
}

async function createTeacher({ email, isActive = true, deletedAt = null }) {
  return prisma.teacher.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      firstName: 'Phase2',
      lastName: 'Teacher',
      isActive,
      deletedAt,
    },
  });
}

describe('SMS Phase 2 teacher authentication', () => {
  let teacher;
  let admin;

  before(async () => {
    await connectDatabase();
    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { slug: role.slug },
        update: { name: role.name, description: role.description },
        create: role,
      });
    }
    await cleanup();

    teacher = await createTeacher({ email: emails.teacher });
    await createTeacher({ email: emails.disabled, isActive: false });
    await createTeacher({ email: emails.deleted, deletedAt: new Date() });

    const role = await prisma.role.findUnique({ where: { slug: ROLE_SLUGS.SUPER_ADMIN } });
    admin = await prisma.admin.create({
      data: {
        email: emails.admin,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'Phase2',
        lastName: 'Admin',
        roleId: role.id,
      },
    });
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  async function login(email = emails.teacher, password = PASSWORD) {
    return request(app).post('/api/v1/teacher/auth/login').send({ email, password });
  }

  it('logs in with valid credentials and never returns passwordHash', async () => {
    const res = await login();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.tokenType, 'Bearer');
    assert.equal(res.body.data.teacher.email, emails.teacher);
    assert.equal(res.body.data.teacher.passwordHash, undefined);
    assert.equal(res.body.data.teacher.tokenVersion, undefined);
  });

  it('rejects wrong password and unknown email generically', async () => {
    const wrong = await login(emails.teacher, 'WrongPassword1');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');

    const unknown = await login('sms.phase2.unknown.teacher@example.com');
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.code, 'INVALID_CREDENTIALS');
    assert.equal(unknown.body.message, wrong.body.message);
  });

  it('rejects disabled and soft-deleted teachers', async () => {
    const disabled = await login(emails.disabled);
    assert.equal(disabled.status, 401);
    assert.equal(disabled.body.code, 'INVALID_CREDENTIALS');

    const deleted = await login(emails.deleted);
    assert.equal(deleted.status, 401);
    assert.equal(deleted.body.code, 'INVALID_CREDENTIALS');
  });

  it('validates login payload', async () => {
    const res = await request(app).post('/api/v1/teacher/auth/login').send({});
    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('returns profile for /me and requires authentication', async () => {
    const unauth = await request(app).get('/api/v1/teacher/auth/me');
    assert.equal(unauth.status, 401);
    assert.equal(unauth.body.code, 'UNAUTHORIZED');

    const loginRes = await login();
    const me = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    assert.equal(me.status, 200);
    assert.equal(me.body.data.teacher.email, emails.teacher);
    assert.equal(me.body.data.teacher.passwordHash, undefined);
  });

  it('rejects invalid and expired tokens', async () => {
    const invalid = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.code, 'TOKEN_INVALID');

    const expired = jwt.sign(
      { sub: teacher.id, actor: 'teacher', tokenVersion: 0 },
      env.jwt.secret,
      {
        expiresIn: '-1s',
        issuer: env.jwt.issuer,
        audience: env.jwt.teacherAudience,
      }
    );
    const res = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_EXPIRED');
  });

  it('rejects admin and student tokens on teacher routes (wrong audience)', async () => {
    const adminToken = signAccessToken({ adminId: admin.id, tokenVersion: admin.tokenVersion });
    const adminRes = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminRes.status, 401);
    assert.equal(adminRes.body.code, 'TOKEN_INVALID');

    const studentToken = signStudentAccessToken({ studentId: teacher.id, tokenVersion: 0 });
    const studentRes = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(studentRes.status, 401);
    assert.equal(studentRes.body.code, 'TOKEN_INVALID');
  });

  it('rejects teacher tokens on admin routes', async () => {
    const loginRes = await login();
    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_INVALID');
  });

  it('revokes tokens on logout via tokenVersion increment', async () => {
    const loginRes = await login();
    const token = loginRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/teacher/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    const meRes = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meRes.status, 401);
    assert.equal(meRes.body.code, 'TOKEN_REVOKED');

    // A fresh login works again after logout.
    const again = await login();
    assert.equal(again.status, 200);
  });

  it('rejects tokens for teachers deactivated after login', async () => {
    const loginRes = await login();
    const token = loginRes.body.data.accessToken;

    await prisma.teacher.update({ where: { id: teacher.id }, data: { isActive: false } });
    const res = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${token}`);
    await prisma.teacher.update({ where: { id: teacher.id }, data: { isActive: true } });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });
});
