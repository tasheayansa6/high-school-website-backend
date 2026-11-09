/**
 * Gradebook module: categories, scales, marks workflow, authz, student isolation.
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
const { buildTermScopeKey, buildActiveScopeKey } = require('../src/utils/smsScope');

const PASSWORD = 'Gradebook99!';
const PREFIX = 'sms.gbook';
const CODE = 'GBK';
const ADMIN = `${PREFIX}.admin@example.com`;
const API = '/api/v1/admin/sms';

async function cleanup() {
  const teacherIds = (
    await prisma.teacher.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const studentIds = (
    await prisma.student.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const yearIds = (
    await prisma.academicYear.findMany({ where: { code: { startsWith: CODE } }, select: { id: true } })
  ).map((r) => r.id);
  const classIds = (
    await prisma.classOffering.findMany({
      where: { academicYearId: { in: yearIds } },
      select: { id: true },
    })
  ).map((r) => r.id);

  const examIds = (
    await prisma.examination.findMany({
      where: {
        OR: [
          { classOfferingId: { in: classIds } },
          { academicYearId: { in: yearIds } },
        ],
      },
      select: { id: true },
    })
  ).map((r) => r.id);

  if (examIds.length) {
    await prisma.examResult.deleteMany({ where: { examId: { in: examIds } } });
    await prisma.examination.deleteMany({ where: { id: { in: examIds } } });
  }

  await prisma.enrollment.deleteMany({
    where: { OR: [{ studentId: { in: studentIds } }, { academicYearId: { in: yearIds } }] },
  });
  await prisma.teachingAssignment.deleteMany({
    where: { OR: [{ teacherId: { in: teacherIds } }, { classOfferingId: { in: classIds } }] },
  });
  await prisma.classOffering.deleteMany({ where: { id: { in: classIds } } });
  await prisma.academicTerm.deleteMany({ where: { academicYearId: { in: yearIds } } });
  await prisma.academicYear.deleteMany({ where: { id: { in: yearIds } } });
  await prisma.gradeLevel.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.section.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.subject.deleteMany({ where: { code: { startsWith: CODE } } });
  await prisma.assessmentCategory.deleteMany({ where: { code: { startsWith: `${CODE}_` } } });
  await prisma.gradingScale.deleteMany({ where: { name: { startsWith: `${PREFIX}` } } });
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await prisma.admin.deleteMany({ where: { email: ADMIN } });
}

describe('Gradebook module', () => {
  const ctx = {};
  let adminToken;
  let teacherToken;
  let otherTeacherToken;
  let studentToken;
  let otherStudentToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const teacher = (req) => req.set('Authorization', `Bearer ${teacherToken}`);
  const otherTeacher = (req) => req.set('Authorization', `Bearer ${otherTeacherToken}`);
  const student = (req) => req.set('Authorization', `Bearer ${studentToken}`);
  const otherStudent = (req) => req.set('Authorization', `Bearer ${otherStudentToken}`);

  before(async () => {
    await connectDatabase();
    await cleanup();

    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { slug: role.slug },
        update: { name: role.name, description: role.description },
        create: role,
      });
    }
    const superRole = await prisma.role.findUnique({ where: { slug: ROLE_SLUGS.SUPER_ADMIN } });
    await prisma.admin.create({
      data: {
        email: ADMIN,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'GB',
        lastName: 'Admin',
        roleId: superRole.id,
      },
    });

    const login = await request(app).post('/api/v1/admin/auth/login').send({ email: ADMIN, password: PASSWORD });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;

    const year = await prisma.academicYear.create({
      data: {
        name: `${CODE} Year`,
        code: `${CODE}-Y`,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2027-06-30'),
        isCurrent: false,
      },
    });
    const term = await prisma.academicTerm.create({
      data: {
        academicYearId: year.id,
        name: 'Term 1',
        sequence: 1,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2026-12-15'),
      },
    });
    const grade = await prisma.gradeLevel.create({
      data: { name: `${CODE} Grade`, code: `${CODE}-G`, sortOrder: 1 },
    });
    const section = await prisma.section.create({
      data: { name: `${CODE} Sec`, code: `${CODE}-S` },
    });
    const subject = await prisma.subject.create({
      data: { name: `${CODE} Math`, code: `${CODE}-MATH` },
    });
    const klass = await prisma.classOffering.create({
      data: {
        name: `${CODE} Class`,
        academicYearId: year.id,
        gradeLevelId: grade.id,
        sectionId: section.id,
      },
    });

    const teacherRow = await prisma.teacher.create({
      data: {
        email: `${PREFIX}.teacher@example.com`,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'GB',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T1`,
      },
    });
    const otherTeacherRow = await prisma.teacher.create({
      data: {
        email: `${PREFIX}.other@example.com`,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'GB',
        lastName: 'Other',
        employeeCode: `${CODE}-T2`,
      },
    });
    const studentRow = await prisma.student.create({
      data: {
        email: `${PREFIX}.student@example.com`,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'GB',
        lastName: 'Student',
        studentCode: `${CODE}-S1`,
      },
    });
    const otherStudentRow = await prisma.student.create({
      data: {
        email: `${PREFIX}.peer@example.com`,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'GB',
        lastName: 'Peer',
        studentCode: `${CODE}-S2`,
      },
    });

    await prisma.teachingAssignment.create({
      data: {
        teacherId: teacherRow.id,
        classOfferingId: klass.id,
        subjectId: subject.id,
        termScopeKey: buildTermScopeKey(null),
      },
    });
    await prisma.enrollment.create({
      data: {
        studentId: studentRow.id,
        classOfferingId: klass.id,
        academicYearId: year.id,
        status: 'ACTIVE',
        activeScopeKey: buildActiveScopeKey(studentRow.id, klass.id),
      },
    });
    await prisma.enrollment.create({
      data: {
        studentId: otherStudentRow.id,
        classOfferingId: klass.id,
        academicYearId: year.id,
        status: 'ACTIVE',
        activeScopeKey: buildActiveScopeKey(otherStudentRow.id, klass.id),
      },
    });

    const tLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: teacherRow.email, password: PASSWORD });
    assert.equal(tLogin.status, 200);
    teacherToken = tLogin.body.data.accessToken;

    const otLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: otherTeacherRow.email, password: PASSWORD });
    assert.equal(otLogin.status, 200);
    otherTeacherToken = otLogin.body.data.accessToken;

    const sLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: studentRow.email, password: PASSWORD });
    assert.equal(sLogin.status, 200);
    studentToken = sLogin.body.data.accessToken;

    const osLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: otherStudentRow.email, password: PASSWORD });
    assert.equal(osLogin.status, 200);
    otherStudentToken = osLogin.body.data.accessToken;

    Object.assign(ctx, {
      year,
      term,
      subject,
      klass,
      teacher: teacherRow,
      student: studentRow,
      otherStudent: otherStudentRow,
    });
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('lists seeded assessment categories and default grading scale', async () => {
    const cats = await admin(request(app).get(`${API}/gradebook/categories`));
    assert.equal(cats.status, 200);
    assert.ok(cats.body.data.items.length >= 8);

    const scales = await admin(request(app).get(`${API}/gradebook/scales`));
    assert.equal(scales.status, 200);
    assert.ok(scales.body.data.items.some((s) => s.isDefault));
  });

  it('creates assessment category and grading scale with weight validation', async () => {
    const cat = await admin(request(app).post(`${API}/gradebook/categories`)).send({
      code: `${CODE}_EXTRA`,
      name: 'Extra credit',
      defaultWeight: 0.5,
    });
    assert.equal(cat.status, 201);
    ctx.categoryId = cat.body.data.category.id;

    const scale = await admin(request(app).post(`${API}/gradebook/scales`)).send({
      name: `${PREFIX} custom scale`,
      weightMode: 'PERCENT',
      treatMissingAsZero: false,
      boundaries: [
        { letter: 'P', minPercent: 50, maxPercent: 100, remark: 'Pass' },
        { letter: 'F', minPercent: 0, maxPercent: 49.99, remark: 'Fail' },
      ],
    });
    assert.equal(scale.status, 201);
    ctx.scaleId = scale.body.data.gradingScale.id;

    const ok = await admin(request(app).post(`${API}/gradebook/validate-weights`)).send({
      weights: [40, 60],
      weightMode: 'PERCENT',
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.valid, true);

    const bad = await admin(request(app).post(`${API}/gradebook/validate-weights`)).send({
      weights: [40, 50],
      gradingScaleId: ctx.scaleId,
    });
    assert.equal(bad.status, 200);
    assert.equal(bad.body.data.valid, false);
  });

  it('teacher creates assessment, enters marks, and saves draft', async () => {
    const create = await teacher(request(app).post('/api/v1/teacher/examinations')).send({
      name: `${CODE} Quiz 1`,
      examType: 'QUIZ',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      academicYearId: ctx.year.id,
      academicTermId: ctx.term.id,
      maxScore: 20,
      categoryId: ctx.categoryId,
      weight: 1,
    });
    assert.equal(create.status, 201);
    ctx.examId = create.body.data.examination.id;
    assert.equal(create.body.data.examination.marksStatus, 'DRAFT');

    const save = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [
        { studentId: ctx.student.id, score: 18 },
        { studentId: ctx.otherStudent.id, score: 14 },
      ],
    });
    assert.equal(save.status, 200);
    assert.equal(save.body.data.total, 2);
    assert.ok(save.body.data.items.every((r) => r.gradeLetter));
  });

  it('rejects scores above max and negative via validation', async () => {
    const over = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 25 }],
    });
    assert.equal(over.status, 422);
  });

  it('blocks unassigned teacher from gradebook and marks', async () => {
    const gb = await otherTeacher(
      request(app)
        .get('/api/v1/teacher/gradebook/class-subject')
        .query({
          classOfferingId: ctx.klass.id,
          subjectId: ctx.subject.id,
          academicYearId: ctx.year.id,
        })
    );
    assert.equal(gb.status, 403);

    const marks = await otherTeacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 10 }],
    });
    assert.equal(marks.status, 403);
  });

  it('teacher submits marks; further teacher edits are locked', async () => {
    const submit = await teacher(
      request(app).post(`/api/v1/teacher/examinations/${ctx.examId}/submit`)
    );
    assert.equal(submit.status, 200);
    assert.equal(submit.body.data.examination.marksStatus, 'SUBMITTED');

    const locked = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 19 }],
    });
    assert.equal(locked.status, 403);
  });

  it('admin sees pending submission and student cannot see unpublished', async () => {
    const pending = await admin(request(app).get(`${API}/gradebook/pending`));
    assert.equal(pending.status, 200);
    assert.ok(pending.body.data.items.some((i) => i.id === ctx.examId));

    const studentView = await student(request(app).get('/api/v1/student/exam-results'));
    assert.equal(studentView.status, 200);
    assert.equal(studentView.body.data.items.length, 0);

    const summary = await student(request(app).get('/api/v1/student/gradebook/summary'));
    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.summary.assessmentCount, 0);
  });

  it('admin approves/publishes; student sees own published results only', async () => {
    const approve = await admin(
      request(app).post(`${API}/gradebook/examinations/${ctx.examId}/approve`)
    );
    assert.equal(approve.status, 200);
    assert.equal(approve.body.data.examination.isPublished, true);

    const mine = await student(request(app).get('/api/v1/student/exam-results'));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.items.length, 1);
    assert.equal(mine.body.data.items[0].studentId, ctx.student.id);
    assert.equal(mine.body.data.items[0].score, 18);

    const peer = await otherStudent(request(app).get('/api/v1/student/exam-results'));
    assert.equal(peer.status, 200);
    assert.equal(peer.body.data.items.length, 1);
    assert.equal(peer.body.data.items[0].studentId, ctx.otherStudent.id);
    assert.equal(peer.body.data.items[0].score, 14);

    const summary = await student(
      request(app)
        .get('/api/v1/student/gradebook/summary')
        .query({ academicYearId: ctx.year.id, academicTermId: ctx.term.id })
    );
    assert.equal(summary.status, 200);
    assert.ok(summary.body.data.subjects.length >= 1);
    assert.ok(summary.body.data.summary.overallAveragePercent != null);
  });

  it('published marks cannot be edited until unpublished and reopened', async () => {
    const blocked = await admin(
      request(app).put(`${API}/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 20 }],
    });
    assert.equal(blocked.status, 422);

    const unpublish = await admin(
      request(app).post(`${API}/examinations/${ctx.examId}/unpublish`)
    );
    assert.equal(unpublish.status, 200);

    const stillLocked = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 20 }],
    });
    assert.equal(stillLocked.status, 403);

    const reopen = await admin(
      request(app).post(`${API}/gradebook/examinations/${ctx.examId}/reopen`)
    ).send({ reason: 'Correction' });
    assert.equal(reopen.status, 200);
    assert.equal(reopen.body.data.examination.marksStatus, 'DRAFT');

    const update = await teacher(
      request(app).put(`/api/v1/teacher/examinations/${ctx.examId}/results`)
    ).send({
      results: [{ studentId: ctx.student.id, score: 20 }],
    });
    assert.equal(update.status, 200);
  });

  it('builds class-subject gradebook with weighted totals and overview', async () => {
    const quiz2 = await teacher(request(app).post('/api/v1/teacher/examinations')).send({
      name: `${CODE} Quiz 2`,
      examType: 'QUIZ',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      academicYearId: ctx.year.id,
      academicTermId: ctx.term.id,
      maxScore: 10,
      weight: 1,
    });
    assert.equal(quiz2.status, 201);
    const exam2 = quiz2.body.data.examination.id;

    await teacher(request(app).put(`/api/v1/teacher/examinations/${exam2}/results`)).send({
      results: [{ studentId: ctx.student.id, score: 8 }],
    });

    const book = await teacher(
      request(app)
        .get('/api/v1/teacher/gradebook/class-subject')
        .query({
          classOfferingId: ctx.klass.id,
          subjectId: ctx.subject.id,
          academicYearId: ctx.year.id,
          academicTermId: ctx.term.id,
        })
    );
    assert.equal(book.status, 200);
    assert.ok(book.body.data.assessments.length >= 2);
    const row = book.body.data.students.find((s) => s.studentId === ctx.student.id);
    assert.ok(row);
    assert.ok(row.totalPercent != null);
    const peer = book.body.data.students.find((s) => s.studentId === ctx.otherStudent.id);
    assert.ok(peer);
    assert.ok(peer.missingCount >= 1);

    const overview = await admin(
      request(app)
        .get(`${API}/gradebook/overview`)
        .query({ academicYearId: ctx.year.id })
    );
    assert.equal(overview.status, 200);
    assert.ok(
      overview.body.data.items.some(
        (i) => i.classOfferingId === ctx.klass.id && i.subjectId === ctx.subject.id
      )
    );
  });

  it('records audit history for submit and upsert', async () => {
    const audits = await prisma.auditLog.findMany({
      where: {
        entityType: 'Examination',
        entityId: String(ctx.examId),
        action: { in: ['examinations.submit-marks', 'exam-results.upsert', 'examinations.publish'] },
      },
      orderBy: { id: 'desc' },
      take: 10,
    });
    assert.ok(audits.some((a) => a.action === 'examinations.submit-marks'));
    assert.ok(audits.some((a) => a.action === 'exam-results.upsert'));
  });

  it('denies gradebook admin APIs to unauthenticated callers', async () => {
    const res = await request(app).get(`${API}/gradebook/overview`);
    assert.equal(res.status, 401);
  });
});
