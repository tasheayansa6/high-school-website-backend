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
const { signTeacherAccessToken } = require('../src/utils/token');

const PASSWORD = 'SmsPhase2Student1';
const emails = {
  student: 'sms.phase2.student.auth@example.com',
  disabled: 'sms.phase2.student.auth.disabled@example.com',
  deleted: 'sms.phase2.student.auth.deleted@example.com',
};
const codes = {
  student: 'SMS2-AUTH-001',
  disabled: 'SMS2-AUTH-002',
  deleted: 'SMS2-AUTH-003',
};

async function cleanup() {
  await prisma.student.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });
}

async function createStudent({ key, isActive = true, deletedAt = null }) {
  return prisma.student.create({
    data: {
      email: emails[key],
      studentCode: codes[key],
      passwordHash: await hashPassword(PASSWORD),
      firstName: 'Phase2',
      lastName: 'Student',
      isActive,
      deletedAt,
    },
  });
}

describe('SMS Phase 2 student authentication', () => {
  let student;

  before(async () => {
    await connectDatabase();
    await cleanup();

    student = await createStudent({ key: 'student' });
    await createStudent({ key: 'disabled', isActive: false });
    await createStudent({ key: 'deleted', deletedAt: new Date() });
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  const login = (body) => request(app).post('/api/v1/student/auth/login').send(body);

  it('logs in with email + password', async () => {
    const res = await login({ email: emails.student, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.student.email, emails.student);
    assert.equal(res.body.data.student.studentCode, codes.student);
    assert.equal(res.body.data.student.passwordHash, undefined);
  });

  it('logs in with studentCode + password', async () => {
    const res = await login({ studentCode: codes.student, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.student.id, student.id);
    assert.equal(res.body.data.student.passwordHash, undefined);
  });

  it('rejects wrong password and unknown identities generically', async () => {
    const wrong = await login({ email: emails.student, password: 'WrongPassword1' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');

    const unknownCode = await login({ studentCode: 'SMS2-NOPE', password: PASSWORD });
    assert.equal(unknownCode.status, 401);
    assert.equal(unknownCode.body.code, 'INVALID_CREDENTIALS');
    assert.equal(unknownCode.body.message, wrong.body.message);
  });

  it('rejects disabled and soft-deleted students', async () => {
    const disabled = await login({ studentCode: codes.disabled, password: PASSWORD });
    assert.equal(disabled.status, 401);

    const deleted = await login({ email: emails.deleted, password: PASSWORD });
    assert.equal(deleted.status, 401);
  });

  it('requires exactly one of email or studentCode', async () => {
    const none = await login({ password: PASSWORD });
    assert.equal(none.status, 422);
    assert.equal(none.body.code, 'VALIDATION_ERROR');

    const both = await login({
      email: emails.student,
      studentCode: codes.student,
      password: PASSWORD,
    });
    assert.equal(both.status, 422);
    assert.equal(both.body.code, 'VALIDATION_ERROR');
  });

  it('returns profile for /me and requires authentication', async () => {
    const unauth = await request(app).get('/api/v1/student/auth/me');
    assert.equal(unauth.status, 401);

    const loginRes = await login({ email: emails.student, password: PASSWORD });
    const me = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    assert.equal(me.status, 200);
    assert.equal(me.body.data.student.studentCode, codes.student);
    assert.equal(me.body.data.student.passwordHash, undefined);
  });

  it('rejects invalid, expired, and wrong-audience tokens', async () => {
    const invalid = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', 'Bearer nope');
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.code, 'TOKEN_INVALID');

    const expired = jwt.sign(
      { sub: student.id, actor: 'student', tokenVersion: 0 },
      env.jwt.secret,
      {
        expiresIn: '-1s',
        issuer: env.jwt.issuer,
        audience: env.jwt.studentAudience,
      }
    );
    const expiredRes = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    assert.equal(expiredRes.status, 401);
    assert.equal(expiredRes.body.code, 'TOKEN_EXPIRED');

    const teacherToken = signTeacherAccessToken({ teacherId: student.id, tokenVersion: 0 });
    const wrong = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', `Bearer ${teacherToken}`);
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.code, 'TOKEN_INVALID');
  });

  it('rejects student tokens on teacher and admin routes', async () => {
    const loginRes = await login({ email: emails.student, password: PASSWORD });
    const token = loginRes.body.data.accessToken;

    const teacherRes = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(teacherRes.status, 401);

    const adminRes = await request(app)
      .get('/api/v1/admin/sms/students')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adminRes.status, 401);
  });

  it('revokes tokens on logout via tokenVersion increment', async () => {
    const loginRes = await login({ studentCode: codes.student, password: PASSWORD });
    const token = loginRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/student/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    const meRes = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meRes.status, 401);
    assert.equal(meRes.body.code, 'TOKEN_REVOKED');
  });
});
