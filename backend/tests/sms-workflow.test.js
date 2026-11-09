/**
 * End-to-end Admin -> Teacher -> Student workflow over REAL APIs only.
 * Ops modules (attendance, assignments, exams, fees, announcements) are covered
 * in tests/sms-ops.test.js.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'SmsPhase5Flow1';
const PREFIX = 'sms.phase5.flow';
const CODE = 'SMS5F';
const ADMIN = `${PREFIX}.admin@example.com`;
const API = '/api/v1/admin/sms';

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
  await prisma.admin.deleteMany({ where: { email: ADMIN } });
}

describe('SMS Phase 5 Admin -> Teacher -> Student workflow', () => {
  const ctx = {};
  let adminToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

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

    const role = await prisma.role.findUnique({ where: { slug: ROLE_SLUGS.SUPER_ADMIN } });
    await prisma.admin.create({
      data: {
        email: ADMIN,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'Flow',
        lastName: 'Admin',
        roleId: role.id,
      },
    });
    const login = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN, password: PASSWORD });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('admin creates year, grade, section, subject, class, teacher, students, assignment and enrollment', async () => {
    const post = async (path, body, status = 201) => {
      const res = await admin(request(app).post(`${API}${path}`)).send(body);
      assert.equal(res.status, status, `${path}: ${JSON.stringify(res.body)}`);
      return res.body.data;
    };

    ctx.year = (
      await post('/academic-years', {
        name: 'Flow Year',
        code: `${CODE}-Y`,
        startsOn: '2034-09-01',
        endsOn: '2035-06-30',
      })
    ).academicYear;
    ctx.grade = (await post('/grade-levels', { name: 'Grade F', code: `${CODE}-G`, sortOrder: 99 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'F1', code: `${CODE}-S` })).section;
    ctx.subject = (await post('/subjects', { name: 'Flow Maths', code: `${CODE}-MATH` })).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'Flo',
        lastName: 'Teacher',
      })
    ).teacher;
    ctx.klass = (
      await post('/class-offerings', {
        academicYearId: ctx.year.id,
        gradeLevelId: ctx.grade.id,
        sectionId: ctx.section.id,
        homeroomTeacherId: ctx.teacher.id,
      })
    ).classOffering;

    const mkStudent = async (n) =>
      (
        await post('/students', {
          email: `${PREFIX}.student${n}@example.com`,
          password: PASSWORD,
          firstName: `Flow${n}`,
          lastName: 'Student',
          studentCode: `${CODE}-STU-${n}`,
        })
      ).student;
    ctx.s1 = await mkStudent(1);
    ctx.s2 = await mkStudent(2); // never enrolled

    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
    });
    await post('/enrollments', {
      studentId: ctx.s1.id,
      classOfferingId: ctx.klass.id,
      academicYearId: ctx.year.id,
    });
  });

  it('teacher sees the class and the enrolled student', async () => {
    const login = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD });
    assert.equal(login.status, 200);
    const token = login.body.data.accessToken;

    const classes = await request(app)
      .get('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`);
    assert.deepEqual(classes.body.data.items.map((c) => c.id), [ctx.klass.id]);
    assert.equal(classes.body.data.items[0].enrollmentCount, 1);

    const detail = await request(app)
      .get(`/api/v1/teacher/classes/${ctx.klass.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.deepEqual(detail.body.data.students.map((s) => s.id), [ctx.s1.id]);
  });

  it('student sees own enrollment, class and subject with the assigned teacher', async () => {
    const login = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-STU-1`, password: PASSWORD });
    assert.equal(login.status, 200);
    const token = login.body.data.accessToken;
    const get = (path) =>
      request(app).get(`/api/v1/student${path}`).set('Authorization', `Bearer ${token}`);

    const overview = await get('/dashboard/overview');
    assert.equal(overview.status, 200);
    assert.deepEqual(overview.body.data.counts, {
      activeEnrollments: 1,
      classOfferings: 1,
      subjects: 1,
      teachers: 1,
    });

    const classes = await get('/classes');
    assert.deepEqual(classes.body.data.items.map((c) => c.id), [ctx.klass.id]);
    assert.equal(classes.body.data.items[0].homeroomTeacher.id, ctx.teacher.id);

    const subjects = await get('/subjects');
    assert.equal(subjects.body.data.items[0].id, ctx.subject.id);
    assert.equal(subjects.body.data.items[0].teachers[0].teacher.id, ctx.teacher.id);
  });

  it('an unenrolled student sees nothing', async () => {
    const login = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: `${PREFIX}.student2@example.com`, password: PASSWORD });
    assert.equal(login.status, 200);
    const res = await request(app)
      .get('/api/v1/student/dashboard/overview')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(res.body.data.counts.activeEnrollments, 0);
    assert.equal(res.body.data.subjects.length, 0);
  });

  it('withdrawing the enrollment removes it from the student view', async () => {
    const enrollment = await prisma.enrollment.findFirst({ where: { studentId: ctx.s1.id } });
    const res = await admin(request(app).patch(`${API}/enrollments/${enrollment.id}/status`)).send({
      status: 'WITHDRAWN',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const login = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: `${PREFIX}.student1@example.com`, password: PASSWORD });
    const classes = await request(app)
      .get('/api/v1/student/classes')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(classes.body.data.items.length, 0);
  });
});
