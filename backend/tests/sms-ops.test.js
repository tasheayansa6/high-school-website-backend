/**
 * SMS operations modules: attendance, assignments, exams, fees, announcements.
 * Exercises Admin write + Teacher write + Student read over real APIs.
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

const PASSWORD = 'SmsOpsFlow99!';
const PREFIX = 'sms.ops.flow';
const CODE = 'SMSOPS';
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
  const classIds = (
    await prisma.classOffering.findMany({
      where: { academicYearId: { in: yearIds } },
      select: { id: true },
    })
  ).map((row) => row.id);
  const assignmentIds = (
    await prisma.assignment.findMany({
      where: { OR: [{ teacherId: { in: teacherIds } }, { classOfferingId: { in: classIds } }] },
      select: { id: true },
    })
  ).map((row) => row.id);
  const examIds = (
    await prisma.examination.findMany({
      where: { OR: [{ academicYearId: { in: yearIds } }, { classOfferingId: { in: classIds } }] },
      select: { id: true },
    })
  ).map((row) => row.id);
  const feeIds = (
    await prisma.studentFee.findMany({
      where: { OR: [{ studentId: { in: studentIds } }, { academicYearId: { in: yearIds } }] },
      select: { id: true },
    })
  ).map((row) => row.id);

  if (feeIds.length) {
    await prisma.feePayment.deleteMany({ where: { studentFeeId: { in: feeIds } } });
  }
  await prisma.studentFee.deleteMany({
    where: { OR: [{ id: { in: feeIds } }, { studentId: { in: studentIds } }] },
  });
  await prisma.feeStructure.deleteMany({ where: { name: { startsWith: 'Ops Fee' } } });
  await prisma.examResult.deleteMany({ where: { examId: { in: examIds } } });
  await prisma.examination.deleteMany({ where: { id: { in: examIds } } });
  await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
  await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  await prisma.attendanceRecord.deleteMany({
    where: { OR: [{ studentId: { in: studentIds } }, { classOfferingId: { in: classIds } }] },
  });
  await prisma.announcement.deleteMany({
    where: { OR: [{ createdBy: { email: ADMIN } }, { title: { startsWith: 'Ops Announce' } }] },
  });
  await prisma.enrollment.deleteMany({
    where: { OR: [{ studentId: { in: studentIds } }, { academicYearId: { in: yearIds } }] },
  });
  await prisma.teachingAssignment.deleteMany({
    where: {
      OR: [{ teacherId: { in: teacherIds } }, { classOfferingId: { in: classIds } }],
    },
  });
  await prisma.classOffering.deleteMany({ where: { id: { in: classIds } } });
  await prisma.academicYear.deleteMany({ where: { id: { in: yearIds } } });
  await prisma.gradeLevel.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.section.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.subject.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await prisma.admin.deleteMany({ where: { email: ADMIN } });
}

describe('SMS operations modules', () => {
  const ctx = {};
  let adminToken;
  let teacherToken;
  let studentToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const teacher = (req) => req.set('Authorization', `Bearer ${teacherToken}`);
  const student = (req) => req.set('Authorization', `Bearer ${studentToken}`);

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
        firstName: 'Ops',
        lastName: 'Admin',
        roleId: role.id,
      },
    });

    const login = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN, password: PASSWORD });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;

    const post = async (path, body) => {
      const res = await admin(request(app).post(`${API}${path}`)).send(body);
      assert.equal(res.status, 201, `${path}: ${JSON.stringify(res.body)}`);
      return res.body.data;
    };

    ctx.year = (
      await post('/academic-years', {
        name: 'Ops Year',
        code: `${CODE}-Y`,
        startsOn: '2036-09-01',
        endsOn: '2037-06-30',
      })
    ).academicYear;
    ctx.grade = (await post('/grade-levels', { name: 'Grade O', code: `${CODE}-G`, sortOrder: 88 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'O1', code: `${CODE}-S` })).section;
    ctx.subject = (await post('/subjects', { name: 'Ops Science', code: `${CODE}-SCI` })).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'Ops',
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
    ctx.student = (
      await post('/students', {
        email: `${PREFIX}.student@example.com`,
        password: PASSWORD,
        firstName: 'Ops',
        lastName: 'Student',
        studentCode: `${CODE}-STU`,
      })
    ).student;
    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
    });
    await post('/enrollments', {
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      academicYearId: ctx.year.id,
    });

    const tLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD });
    assert.equal(tLogin.status, 200);
    teacherToken = tLogin.body.data.accessToken;

    const sLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-STU`, password: PASSWORD });
    assert.equal(sLogin.status, 200);
    studentToken = sLogin.body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('teacher marks attendance and student can read it', async () => {
    const mark = await teacher(request(app).post('/api/v1/teacher/attendance')).send({
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      attendanceDate: '2036-10-01',
      status: 'PRESENT',
    });
    assert.equal(mark.status, 200, JSON.stringify(mark.body));
    assert.equal(mark.body.data.attendance.status, 'PRESENT');

    const list = await student(request(app).get('/api/v1/student/attendance'));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((row) => row.status === 'PRESENT'));
  });

  it('teacher creates assignment, student submits, teacher grades', async () => {
    const created = await teacher(request(app).post('/api/v1/teacher/assignments')).send({
      title: 'Ops Homework 1',
      description: 'Read chapter 1',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      maxScore: 20,
      isPublished: true,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ctx.assignmentId = created.body.data.assignment.id;

    const submit = await student(
      request(app).post(`/api/v1/student/assignments/${ctx.assignmentId}/submit`)
    ).send({ content: 'My answers' });
    assert.equal(submit.status, 201, JSON.stringify(submit.body));

    const submissions = await teacher(
      request(app).get(`/api/v1/teacher/assignments/${ctx.assignmentId}/submissions`)
    );
    assert.equal(submissions.status, 200);
    const submissionId = submissions.body.data.items[0].id;

    const graded = await teacher(
      request(app).patch(
        `/api/v1/teacher/assignments/${ctx.assignmentId}/submissions/${submissionId}/grade`
      )
    ).send({ score: 18, feedback: 'Good work', status: 'GRADED' });
    assert.equal(graded.status, 200, JSON.stringify(graded.body));
    assert.equal(graded.body.data.submission.score, 18);
  });

  it('admin creates exam, teacher enters results, student sees published results', async () => {
    const examRes = await admin(request(app).post(`${API}/examinations`)).send({
      name: 'Ops Midterm',
      examType: 'MIDTERM',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      academicYearId: ctx.year.id,
      examDate: '2036-11-15',
      maxScore: 100,
    });
    assert.equal(examRes.status, 201, JSON.stringify(examRes.body));
    ctx.examId = examRes.body.data.examination.id;

    const results = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 87, gradeLetter: 'A' }],
    });
    assert.equal(results.status, 200, JSON.stringify(results.body));

    const publish = await admin(request(app).post(`${API}/examinations/${ctx.examId}/publish`));
    assert.equal(publish.status, 200, JSON.stringify(publish.body));

    const studentResults = await student(request(app).get('/api/v1/student/exam-results'));
    assert.equal(studentResults.status, 200);
    assert.ok(studentResults.body.data.items.some((row) => Number(row.score) === 87));
  });

  it('admin manages fees and student can view balance', async () => {
    const structure = await admin(request(app).post(`${API}/fees`)).send({
      name: 'Ops Fee Tuition',
      amount: 5000,
      currency: 'ETB',
      description: 'Term fee',
    });
    assert.equal(structure.status, 201, JSON.stringify(structure.body));
    const feeStructureId = structure.body.data.feeStructure.id;

    const assigned = await admin(request(app).post(`${API}/student-fees`)).send({
      studentId: ctx.student.id,
      feeStructureId,
      academicYearId: ctx.year.id,
      amountDue: 5000,
      dueDate: '2036-12-01',
    });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    const studentFeeId = assigned.body.data.studentFee.id;

    const payment = await admin(request(app).post(`${API}/student-fees/${studentFeeId}/payments`)).send({
      amount: 2000,
      paymentMethod: 'CASH',
      reference: 'OPS-PAY-1',
    });
    assert.equal(payment.status, 201, JSON.stringify(payment.body));

    const fees = await student(request(app).get('/api/v1/student/fees'));
    assert.equal(fees.status, 200);
    const row = fees.body.data.items.find((item) => item.id === studentFeeId);
    assert.ok(row);
    assert.equal(row.status, 'PARTIAL');
    assert.equal(Number(row.amountPaid), 2000);
  });

  it('admin publishes announcement visible to student', async () => {
    const created = await admin(request(app).post(`${API}/announcements`)).send({
      title: 'Ops Announce Welcome',
      body: 'School opens next week.',
      audience: 'STUDENTS',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data.announcement.id;

    const published = await admin(request(app).post(`${API}/announcements/${id}/publish`));
    assert.equal(published.status, 200, JSON.stringify(published.body));

    const list = await student(request(app).get('/api/v1/student/announcements'));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((row) => row.id === id));
  });

  it('reports overview returns aggregate buckets', async () => {
    const res = await admin(request(app).get(`${API}/reports/overview`)).query({
      academicYearId: ctx.year.id,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const data = res.body.data;
    assert.ok(data.attendance);
    assert.ok(data.fees);
    assert.ok(data.exams);
    assert.ok(data.enrollments);
  });
});
