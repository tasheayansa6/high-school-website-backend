const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { signTeacherAccessToken } = require('../src/utils/token');
const { buildActiveScopeKey, buildTermScopeKey } = require('../src/utils/smsScope');

const PASSWORD = 'SmsPhase5Student1';
const PREFIX = 'sms.phase5.portal';
const CODE = 'SMS5P';
const API = '/api/v1/student';

const emails = {
  a: `${PREFIX}.studenta@example.com`,
  b: `${PREFIX}.studentb@example.com`,
  c: `${PREFIX}.studentc@example.com`,
  teacher: `${PREFIX}.teacher@example.com`,
  teacher2: `${PREFIX}.teacher2@example.com`,
};
const codes = { a: `${CODE}-STU-A`, b: `${CODE}-STU-B`, c: `${CODE}-STU-C` };

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

describe('SMS Phase 5 student portal read APIs', () => {
  const ctx = {};

  async function login(identity, password = PASSWORD) {
    return request(app).post(`${API}/auth/login`).send({ ...identity, password });
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
    ctx.teacher2 = await prisma.teacher.create({
      data: { email: emails.teacher2, passwordHash, firstName: 'Other', lastName: 'Teacher' },
    });

    const year = await prisma.academicYear.create({
      data: {
        name: 'Phase 5 Year',
        code: `${CODE}-YEAR`,
        startsOn: new Date('2032-09-01'),
        endsOn: new Date('2033-06-30'),
      },
    });
    const grade = await prisma.gradeLevel.create({ data: { name: 'Grade P5', code: `${CODE}-G` } });
    const [secA, secB] = await Promise.all([
      prisma.section.create({ data: { name: 'A', code: `${CODE}-A` } }),
      prisma.section.create({ data: { name: 'B', code: `${CODE}-B` } }),
    ]);
    ctx.math = await prisma.subject.create({ data: { name: 'Math P5', code: `${CODE}-MATH` } });
    ctx.sci = await prisma.subject.create({ data: { name: 'Science P5', code: `${CODE}-SCI` } });
    ctx.art = await prisma.subject.create({ data: { name: 'Art P5', code: `${CODE}-ART` } });

    const mkClass = (section) =>
      prisma.classOffering.create({
        data: {
          academicYearId: year.id,
          gradeLevelId: grade.id,
          sectionId: section.id,
          name: `Grade P5 ${section.name}`,
        },
      });
    ctx.classA = await mkClass(secA);
    ctx.classB = await mkClass(secB);

    const assign = (teacherId, classOfferingId, subjectId) =>
      prisma.teachingAssignment.create({
        data: { teacherId, classOfferingId, subjectId, termScopeKey: buildTermScopeKey(null) },
      });
    await assign(ctx.teacher.id, ctx.classA.id, ctx.math.id);
    await assign(ctx.teacher2.id, ctx.classA.id, ctx.sci.id);
    await assign(ctx.teacher.id, ctx.classB.id, ctx.art.id);
    ctx.deletedAssignment = await assign(ctx.teacher2.id, ctx.classA.id, ctx.art.id);
    await prisma.teachingAssignment.update({
      where: { id: ctx.deletedAssignment.id },
      data: { deletedAt: new Date() },
    });

    const mkStudent = (key, extra = {}) =>
      prisma.student.create({
        data: {
          email: emails[key],
          passwordHash,
          firstName: `Stu${key.toUpperCase()}`,
          lastName: 'Portal',
          studentCode: codes[key],
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

    ctx.a = await mkStudent('a');
    ctx.b = await mkStudent('b');
    ctx.c = await mkStudent('c'); // no ACTIVE enrollment
    await enroll(ctx.a, ctx.classA);
    await enroll(ctx.b, ctx.classB);
    await enroll(ctx.c, ctx.classA, 'WITHDRAWN');

    const tokenA = await login({ email: emails.a });
    assert.equal(tokenA.status, 200);
    ctx.tokenA = tokenA.body.data.accessToken;
    ctx.tokenB = (await login({ studentCode: codes.b })).body.data.accessToken;
    ctx.tokenC = (await login({ email: emails.c })).body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  describe('auth', () => {
    it('logs in with email or studentCode and rejects bad credentials', async () => {
      const byEmail = await login({ email: emails.a });
      assert.equal(byEmail.status, 200);
      assert.equal(byEmail.body.data.student.email, emails.a);
      assert.equal(byEmail.body.data.student.passwordHash, undefined);

      const byCode = await login({ studentCode: codes.a });
      assert.equal(byCode.status, 200);
      assert.equal(byCode.body.data.student.id, ctx.a.id);

      const bad = await login({ email: emails.a }, 'WrongPassword1');
      assert.equal(bad.status, 401);
      assert.equal(bad.body.code, 'INVALID_CREDENTIALS');

      const both = await login({ email: emails.a, studentCode: codes.a });
      assert.equal(both.status, 422);
    });

    it('returns /me and rejects missing, teacher and revoked tokens (logout)', async () => {
      const me = await get('/auth/me', ctx.tokenA);
      assert.equal(me.status, 200);
      assert.equal(me.body.data.student.studentCode, codes.a);

      const anonymous = await request(app).get(`${API}/auth/me`);
      assert.equal(anonymous.status, 401);

      const teacherToken = signTeacherAccessToken({
        teacherId: ctx.teacher.id,
        tokenVersion: ctx.teacher.tokenVersion,
      });
      const wrongActor = await get('/dashboard/overview', teacherToken);
      assert.equal(wrongActor.status, 401);

      const fresh = (await login({ email: emails.a })).body.data.accessToken;
      const out = await request(app)
        .post(`${API}/auth/logout`)
        .set('Authorization', `Bearer ${fresh}`);
      assert.equal(out.status, 200);

      const revoked = await get('/dashboard/overview', fresh);
      assert.equal(revoked.status, 401);
      assert.equal(revoked.body.code, 'TOKEN_REVOKED');
      // The earlier token was issued before logout of a newer session, so refresh for later tests.
      ctx.tokenA = (await login({ email: emails.a })).body.data.accessToken;
    });
  });

  describe('portal reads', () => {
    it('requires student authentication on portal routes', async () => {
      for (const path of ['/dashboard/overview', '/profile', '/enrollment', '/classes', '/subjects']) {
        const res = await request(app).get(`${API}${path}`);
        assert.equal(res.status, 401, path);
        assert.equal(res.body.code, 'UNAUTHORIZED', path);
      }
    });

    it('returns scoped dashboard overview with real counts only', async () => {
      const res = await get('/dashboard/overview', ctx.tokenA);
      assert.equal(res.status, 200);
      const { student, counts, enrollments, subjects } = res.body.data;
      assert.equal(student.id, ctx.a.id);
      assert.equal(student.passwordHash, undefined);
      assert.deepEqual(counts, {
        activeEnrollments: 1,
        classOfferings: 1,
        subjects: 2,
        teachers: 2,
      });
      assert.equal(enrollments.length, 1);
      assert.equal(enrollments[0].classOffering.id, ctx.classA.id);
      assert.equal(enrollments[0].classOffering.gradeLevel.code, `${CODE}-G`);
      assert.equal(enrollments[0].classOffering.section.code, `${CODE}-A`);
      assert.equal(enrollments[0].classOffering.academicYear.code, `${CODE}-YEAR`);
      assert.deepEqual(subjects.map((s) => s.code).sort(), [`${CODE}-MATH`, `${CODE}-SCI`]);
      assert.equal(res.body.data.attendance, undefined);
      assert.equal(res.body.data.assignments, undefined);
    });

    it('lists subjects on the active class with public teacher fields only', async () => {
      const res = await get('/subjects', ctx.tokenA);
      assert.equal(res.status, 200);
      const { items, total } = res.body.data;
      assert.equal(total, 2);
      const math = items.find((s) => s.code === `${CODE}-MATH`);
      assert.equal(math.teachers.length, 1);
      assert.equal(math.teachers[0].teacher.id, ctx.teacher.id);
      assert.equal(math.teachers[0].classOffering.id, ctx.classA.id);
      assert.equal(math.teachers[0].teacher.passwordHash, undefined);
      assert.equal(math.teachers[0].teacher.phone, undefined);
      assert.equal(math.teachers[0].teacher.employeeCode, undefined);
      // Soft-deleted assignment and other-class subject are excluded.
      assert.equal(items.some((s) => s.code === `${CODE}-ART`), false);
    });

    it('lists active classes with year/grade/section', async () => {
      const res = await get('/classes', ctx.tokenA);
      assert.equal(res.status, 200);
      const { items, total } = res.body.data;
      assert.equal(total, 1);
      assert.equal(items[0].id, ctx.classA.id);
      assert.equal(items[0].subjectCount, 2);
      assert.ok(items[0].academicYear.name);
      assert.ok(items[0].gradeLevel.name);
      assert.ok(items[0].section.name);
    });

    it('returns profile and current enrollment detail', async () => {
      const profile = await get('/profile', ctx.tokenA);
      assert.equal(profile.status, 200);
      assert.equal(profile.body.data.student.email, emails.a);
      assert.equal(profile.body.data.student.passwordHash, undefined);
      assert.equal(profile.body.data.summary.activeEnrollments, 1);
      assert.equal(profile.body.data.enrollments[0].status, 'ACTIVE');

      const enrollment = await get('/enrollment', ctx.tokenA);
      assert.equal(enrollment.status, 200);
      assert.equal(enrollment.body.data.total, 1);
      assert.equal(enrollment.body.data.current.classOffering.id, ctx.classA.id);
    });

    it('isolates Student A from Student B', async () => {
      const [classesB, subjectsB, overviewB, profileB] = await Promise.all([
        get('/classes', ctx.tokenB),
        get('/subjects', ctx.tokenB),
        get('/dashboard/overview', ctx.tokenB),
        get('/profile', ctx.tokenB),
      ]);
      assert.deepEqual(classesB.body.data.items.map((c) => c.id), [ctx.classB.id]);
      assert.deepEqual(subjectsB.body.data.items.map((s) => s.code), [`${CODE}-ART`]);
      assert.equal(overviewB.body.data.student.id, ctx.b.id);
      assert.equal(profileB.body.data.student.id, ctx.b.id);

      const serialized = JSON.stringify([classesB.body, subjectsB.body, overviewB.body, profileB.body]);
      assert.equal(serialized.includes(emails.a), false);
      assert.equal(serialized.includes(codes.a), false);
      assert.equal(serialized.includes(`${CODE}-MATH`), false);

      const serializedA = JSON.stringify(
        (await Promise.all([get('/classes', ctx.tokenA), get('/subjects', ctx.tokenA)])).map((r) => r.body)
      );
      assert.equal(serializedA.includes(emails.b), false);
      assert.equal(serializedA.includes(`${CODE}-ART`), false);
    });

    it('returns empty views for a student without ACTIVE enrollment', async () => {
      const [overview, classes, subjects, enrollment] = await Promise.all([
        get('/dashboard/overview', ctx.tokenC),
        get('/classes', ctx.tokenC),
        get('/subjects', ctx.tokenC),
        get('/enrollment', ctx.tokenC),
      ]);
      assert.equal(overview.status, 200);
      assert.equal(overview.body.data.counts.activeEnrollments, 0);
      assert.equal(overview.body.data.counts.subjects, 0);
      assert.equal(classes.body.data.items.length, 0);
      assert.equal(subjects.body.data.items.length, 0);
      assert.equal(enrollment.body.data.current, null);
    });

    it('hides soft-deleted enrollments and class offerings', async () => {
      await prisma.enrollment.updateMany({
        where: { studentId: ctx.b.id },
        data: { deletedAt: new Date(), activeScopeKey: `deleted:${Date.now()}:${ctx.b.id}` },
      });
      const classes = await get('/classes', ctx.tokenB);
      assert.equal(classes.body.data.items.length, 0);
      const subjects = await get('/subjects', ctx.tokenB);
      assert.equal(subjects.body.data.items.length, 0);
    });

    it('hides subjects when assignment or subject is soft-deleted', async () => {
      await prisma.teachingAssignment.updateMany({
        where: { classOfferingId: ctx.classA.id, subjectId: ctx.sci.id },
        data: { deletedAt: new Date() },
      });
      const res = await get('/subjects', ctx.tokenA);
      assert.deepEqual(res.body.data.items.map((s) => s.code), [`${CODE}-MATH`]);

      await prisma.subject.update({ where: { id: ctx.math.id }, data: { deletedAt: new Date() } });
      const after = await get('/subjects', ctx.tokenA);
      assert.equal(after.body.data.items.length, 0);
    });
  });
});
