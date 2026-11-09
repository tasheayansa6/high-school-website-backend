const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { buildActiveScopeKey, buildTermScopeKey } = require('../src/utils/smsScope');

const PASSWORD = 'SmsPhase4Teacher1';
const PREFIX = 'sms.phase4.portal';
const CODE = 'SMS4P';
const API = '/api/v1/teacher';

const emails = {
  teacher: `${PREFIX}.teacher@example.com`,
  other: `${PREFIX}.other@example.com`,
};

async function cleanup() {
  const studentIds = (
    await prisma.student.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((row) => row.id);
  const teacherIds = (
    await prisma.teacher.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((row) => row.id);
  const yearIds = (
    await prisma.academicYear.findMany({ where: { code: { startsWith: CODE } }, select: { id: true } })
  ).map((row) => row.id);

  await prisma.enrollment.deleteMany({
    where: { OR: [{ studentId: { in: studentIds } }, { academicYearId: { in: yearIds } }] },
  });
  await prisma.teachingAssignment.deleteMany({
    where: {
      OR: [{ teacherId: { in: teacherIds } }, { classOffering: { academicYearId: { in: yearIds } } }],
    },
  });
  await prisma.classOffering.deleteMany({ where: { academicYearId: { in: yearIds } } });
  await prisma.academicYear.deleteMany({ where: { id: { in: yearIds } } });
  await prisma.gradeLevel.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.section.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.subject.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
}

describe('SMS Phase 4 teacher portal read APIs', () => {
  const ctx = {};

  async function login(email = emails.teacher) {
    const res = await request(app).post(`${API}/auth/login`).send({ email, password: PASSWORD });
    assert.equal(res.status, 200);
    return res.body.data.accessToken;
  }

  const get = (path, token) =>
    request(app).get(`${API}${path}`).set('Authorization', `Bearer ${token}`);

  before(async () => {
    await connectDatabase();
    await cleanup();

    const passwordHash = await hashPassword(PASSWORD);
    ctx.teacher = await prisma.teacher.create({
      data: { email: emails.teacher, passwordHash, firstName: 'Portal', lastName: 'Teacher' },
    });
    ctx.other = await prisma.teacher.create({
      data: { email: emails.other, passwordHash, firstName: 'Other', lastName: 'Teacher' },
    });

    const year = await prisma.academicYear.create({
      data: {
        name: 'Phase 4 Year',
        code: `${CODE}-YEAR`,
        startsOn: new Date('2030-09-01'),
        endsOn: new Date('2031-06-30'),
      },
    });
    const grade = await prisma.gradeLevel.create({ data: { name: 'Grade P4', code: `${CODE}-G` } });
    const [secA, secB] = await Promise.all([
      prisma.section.create({ data: { name: 'A', code: `${CODE}-A` } }),
      prisma.section.create({ data: { name: 'B', code: `${CODE}-B` } }),
    ]);
    ctx.math = await prisma.subject.create({ data: { name: 'Math P4', code: `${CODE}-MATH` } });
    ctx.sci = await prisma.subject.create({ data: { name: 'Science P4', code: `${CODE}-SCI` } });

    const mkClass = (section) =>
      prisma.classOffering.create({
        data: {
          academicYearId: year.id,
          gradeLevelId: grade.id,
          sectionId: section.id,
          name: `Grade P4 ${section.name}`,
        },
      });
    ctx.classA = await mkClass(secA);
    ctx.classB = await mkClass(secB); // not taught by ctx.teacher

    const assign = (teacherId, classOfferingId, subjectId) =>
      prisma.teachingAssignment.create({
        data: {
          teacherId,
          classOfferingId,
          subjectId,
          termScopeKey: buildTermScopeKey(null),
        },
      });
    await assign(ctx.teacher.id, ctx.classA.id, ctx.math.id);
    await assign(ctx.teacher.id, ctx.classA.id, ctx.sci.id);
    await assign(ctx.other.id, ctx.classB.id, ctx.math.id);

    const mkStudent = (n, extra = {}) =>
      prisma.student.create({
        data: {
          email: `${PREFIX}.student${n}@example.com`,
          passwordHash: 'x'.repeat(20),
          firstName: `Stu${n}`,
          lastName: `Portal${n}`,
          studentCode: `${CODE}-S${n}`,
          ...extra,
        },
      });
    const enroll = (student, klass, status = 'ACTIVE') =>
      prisma.enrollment.create({
        data: {
          studentId: student.id,
          classOfferingId: klass.id,
          academicYearId: year.id,
          status,
          activeScopeKey: buildActiveScopeKey(student.id, klass.id),
        },
      });

    ctx.s1 = await mkStudent(1);
    ctx.s2 = await mkStudent(2);
    ctx.s3 = await mkStudent(3); // withdrawn in class A
    ctx.s4 = await mkStudent(4); // only in class B
    await enroll(ctx.s1, ctx.classA);
    await enroll(ctx.s2, ctx.classA);
    await enroll(ctx.s3, ctx.classA, 'WITHDRAWN');
    await enroll(ctx.s4, ctx.classB);

    ctx.token = await login();
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('logs in and returns /me', async () => {
    const me = await get('/auth/me', ctx.token);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.teacher.email, emails.teacher);
  });

  it('requires teacher authentication on portal routes', async () => {
    for (const path of [
      '/dashboard/overview',
      '/profile',
      '/classes',
      `/classes/${ctx.classA.id}`,
      '/subjects',
      '/students',
    ]) {
      const res = await request(app).get(`${API}${path}`);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.code, 'UNAUTHORIZED', path);
    }
  });

  it('returns scoped dashboard overview with real counts', async () => {
    const res = await get('/dashboard/overview', ctx.token);
    assert.equal(res.status, 200);
    const { teacher, counts, recentAssignments } = res.body.data;
    assert.equal(teacher.email, emails.teacher);
    assert.equal(teacher.passwordHash, undefined);
    assert.deepEqual(counts, {
      classOfferings: 1,
      subjects: 2,
      students: 2,
      teachingAssignments: 2,
    });
    assert.equal(recentAssignments.length, 2);
    assert.ok(recentAssignments[0].classOffering.name);
    assert.ok(recentAssignments[0].subject.code);
  });

  it('lists only assigned classes with active enrollment counts', async () => {
    const res = await get('/classes', ctx.token);
    assert.equal(res.status, 200);
    const { items } = res.body.data;
    assert.equal(items.length, 1);
    assert.equal(items[0].id, ctx.classA.id);
    assert.equal(items[0].enrollmentCount, 2);
    assert.equal(items[0].gradeLevel.code, `${CODE}-G`);
    assert.equal(items[0].section.code, `${CODE}-A`);
    assert.equal(items[0].academicYear.code, `${CODE}-YEAR`);
    assert.equal(items[0].subjects.length, 2);
  });

  it('returns class detail with active students and own subjects only', async () => {
    const res = await get(`/classes/${ctx.classA.id}`, ctx.token);
    assert.equal(res.status, 200);
    const { classOffering, students, subjects } = res.body.data;
    assert.equal(classOffering.id, ctx.classA.id);
    assert.deepEqual(
      students.map((s) => s.id).sort(),
      [ctx.s1.id, ctx.s2.id].sort()
    );
    for (const student of students) {
      assert.equal(student.passwordHash, undefined);
      assert.equal(student.tokenVersion, undefined);
      assert.equal(student.guardianPhone, undefined);
      assert.ok(student.studentCode);
    }
    assert.equal(subjects.length, 2);
  });

  it('rejects a class the teacher is not assigned to', async () => {
    const res = await get(`/classes/${ctx.classB.id}`, ctx.token);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CLASS_OFFERING_NOT_FOUND');

    const missing = await get('/classes/99999999', ctx.token);
    assert.equal(missing.status, 404);

    const invalid = await get('/classes/abc', ctx.token);
    assert.equal(invalid.status, 422);
  });

  it('lists distinct subjects with class offerings', async () => {
    const res = await get('/subjects', ctx.token);
    assert.equal(res.status, 200);
    const { items } = res.body.data;
    assert.equal(items.length, 2);
    for (const subject of items) {
      assert.equal(subject.classOfferings.length, 1);
      assert.equal(subject.classOfferings[0].id, ctx.classA.id);
    }
  });

  it('scopes students to assigned classes, paginates and searches', async () => {
    const res = await get('/students', ctx.token);
    assert.equal(res.status, 200);
    const { items, pagination } = res.body.data;
    assert.deepEqual(items.map((s) => s.id).sort(), [ctx.s1.id, ctx.s2.id].sort());
    assert.equal(pagination.total, 2);
    assert.equal(items[0].passwordHash, undefined);
    assert.equal(items[0].classOfferings[0].id, ctx.classA.id);

    const page = await get('/students?page=2&limit=1', ctx.token);
    assert.equal(page.body.data.items.length, 1);
    assert.equal(page.body.data.pagination.totalPages, 2);

    const search = await get(`/students?q=${ctx.s2.studentCode}`, ctx.token);
    assert.deepEqual(search.body.data.items.map((s) => s.id), [ctx.s2.id]);

    const byClass = await get(`/students?classOfferingId=${ctx.classA.id}`, ctx.token);
    assert.equal(byClass.body.data.pagination.total, 2);

    const outsider = await get(`/students?q=${ctx.s4.studentCode}`, ctx.token);
    assert.equal(outsider.body.data.items.length, 0);
  });

  it('rejects classOfferingId filter for unassigned classes', async () => {
    const res = await get(`/students?classOfferingId=${ctx.classB.id}`, ctx.token);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CLASS_OFFERING_NOT_FOUND');
  });

  it('returns profile with assignment summary', async () => {
    const res = await get('/profile', ctx.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.teacher.email, emails.teacher);
    assert.equal(res.body.data.teacher.passwordHash, undefined);
    assert.equal(res.body.data.summary.classOfferings, 1);
    assert.equal(res.body.data.summary.students, 2);
  });

  it('isolates data between teachers', async () => {
    const otherToken = await login(emails.other);
    const classes = await get('/classes', otherToken);
    assert.deepEqual(classes.body.data.items.map((c) => c.id), [ctx.classB.id]);

    const students = await get('/students', otherToken);
    assert.deepEqual(students.body.data.items.map((s) => s.id), [ctx.s4.id]);

    const denied = await get(`/classes/${ctx.classA.id}`, otherToken);
    assert.equal(denied.status, 404);
  });

  it('ignores soft-deleted assignments', async () => {
    await prisma.teachingAssignment.updateMany({
      where: { teacherId: ctx.other.id },
      data: { deletedAt: new Date() },
    });
    const otherToken = await login(emails.other);
    const classes = await get('/classes', otherToken);
    assert.equal(classes.body.data.items.length, 0);
    const students = await get('/students', otherToken);
    assert.equal(students.body.data.items.length, 0);
  });
});
