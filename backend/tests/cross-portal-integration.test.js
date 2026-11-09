/**
 * Cross-portal connectivity: Admin ↔ Teacher ↔ Student over real APIs.
 * Covers security isolation and publication gates used by the SMS ops modules.
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

const PASSWORD = 'CrossPortal99!';
const PREFIX = 'sms.xportal';
const CODE = 'XPORT';
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
  await prisma.feeStructure.deleteMany({ where: { name: { startsWith: 'XPortal Fee' } } });
  await prisma.examResult.deleteMany({ where: { examId: { in: examIds } } });
  await prisma.examination.deleteMany({ where: { id: { in: examIds } } });
  await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
  await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  await prisma.attendanceRecord.deleteMany({
    where: { OR: [{ studentId: { in: studentIds } }, { classOfferingId: { in: classIds } }] },
  });
  await prisma.announcement.deleteMany({
    where: { OR: [{ createdBy: { email: ADMIN } }, { title: { startsWith: 'XPortal' } }] },
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

describe('Cross-portal integration and isolation', () => {
  const ctx = {};
  let adminToken;
  let teacherToken;
  let outsiderTeacherToken;
  let studentToken;
  let otherStudentToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const teacher = (req) => req.set('Authorization', `Bearer ${teacherToken}`);
  const outsider = (req) => req.set('Authorization', `Bearer ${outsiderTeacherToken}`);
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
        firstName: 'X',
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
        name: 'XPortal Year',
        code: `${CODE}-Y`,
        startsOn: '2037-09-01',
        endsOn: '2038-06-30',
      })
    ).academicYear;
    ctx.grade = (await post('/grade-levels', { name: 'Grade X', code: `${CODE}-G`, sortOrder: 77 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'X1', code: `${CODE}-S` })).section;
    ctx.sectionB = (await post('/sections', { name: 'X2', code: `${CODE}-S2` })).section;
    ctx.subject = (await post('/subjects', { name: 'XPortal Chem', code: `${CODE}-CHEM` })).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'X',
        lastName: 'Teacher',
      })
    ).teacher;
    ctx.outsiderTeacher = (
      await post('/teachers', {
        email: `${PREFIX}.outsider@example.com`,
        password: PASSWORD,
        firstName: 'Out',
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
    ctx.klassB = (
      await post('/class-offerings', {
        academicYearId: ctx.year.id,
        gradeLevelId: ctx.grade.id,
        sectionId: ctx.sectionB.id,
        homeroomTeacherId: ctx.outsiderTeacher.id,
      })
    ).classOffering;
    ctx.student = (
      await post('/students', {
        email: `${PREFIX}.student@example.com`,
        password: PASSWORD,
        firstName: 'X',
        lastName: 'Student',
        studentCode: `${CODE}-STU`,
      })
    ).student;
    ctx.otherStudent = (
      await post('/students', {
        email: `${PREFIX}.other@example.com`,
        password: PASSWORD,
        firstName: 'Y',
        lastName: 'Student',
        studentCode: `${CODE}-STU2`,
      })
    ).student;

    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
    });
    await post('/teaching-assignments', {
      teacherId: ctx.outsiderTeacher.id,
      classOfferingId: ctx.klassB.id,
      subjectId: ctx.subject.id,
    });
    await post('/enrollments', {
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      academicYearId: ctx.year.id,
    });
    await post('/enrollments', {
      studentId: ctx.otherStudent.id,
      classOfferingId: ctx.klassB.id,
      academicYearId: ctx.year.id,
    });

    const tLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD });
    assert.equal(tLogin.status, 200);
    teacherToken = tLogin.body.data.accessToken;

    const oLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.outsider@example.com`, password: PASSWORD });
    assert.equal(oLogin.status, 200);
    outsiderTeacherToken = oLogin.body.data.accessToken;

    const sLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-STU`, password: PASSWORD });
    assert.equal(sLogin.status, 200);
    studentToken = sLogin.body.data.accessToken;

    const s2 = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-STU2`, password: PASSWORD });
    assert.equal(s2.status, 200);
    otherStudentToken = s2.body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('rejects unauthenticated access to admin, teacher and student portals', async () => {
    const paths = [
      '/api/v1/admin/sms/teachers',
      '/api/v1/teacher/classes',
      '/api/v1/student/classes',
    ];
    for (const path of paths) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
    }
  });

  it('rejects cross-audience tokens (student token on teacher API)', async () => {
    const res = await request(app)
      .get('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res.status, 401);
  });

  it('admin→teacher: assigned teacher sees class; outsider does not', async () => {
    const mine = await teacher(request(app).get('/api/v1/teacher/classes'));
    assert.equal(mine.status, 200);
    assert.deepEqual(
      mine.body.data.items.map((row) => row.id).sort(),
      [ctx.klass.id]
    );

    const theirs = await outsider(request(app).get(`/api/v1/teacher/classes/${ctx.klass.id}`));
    assert.equal(theirs.status, 404);

    const students = await teacher(request(app).get('/api/v1/teacher/students')).query({
      classOfferingId: ctx.klass.id,
    });
    assert.equal(students.status, 200);
    assert.ok(students.body.data.items.some((row) => row.id === ctx.student.id));
    assert.ok(!students.body.data.items.some((row) => row.id === ctx.otherStudent.id));
  });

  it('teacher→student attendance: teacher marks, student and admin see it; student cannot write', async () => {
    const mark = await teacher(request(app).post('/api/v1/teacher/attendance')).send({
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      attendanceDate: '2037-10-05',
      status: 'LATE',
      notes: 'Arrived late',
    });
    assert.equal(mark.status, 200, JSON.stringify(mark.body));

    const forbiddenWrite = await student(request(app).post('/api/v1/teacher/attendance')).send({
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      attendanceDate: '2037-10-06',
      status: 'PRESENT',
    });
    assert.equal(forbiddenWrite.status, 401);

    const studentView = await student(request(app).get('/api/v1/student/attendance'));
    assert.equal(studentView.status, 200);
    assert.ok(studentView.body.data.items.some((row) => row.status === 'LATE'));

    const otherView = await request(app)
      .get('/api/v1/student/attendance')
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(otherView.status, 200);
    assert.equal(
      otherView.body.data.items.filter((row) => row.studentId === ctx.student.id).length,
      0
    );

    const adminView = await admin(request(app).get(`${API}/attendance`)).query({
      classOfferingId: ctx.klass.id,
      attendanceDate: '2037-10-05',
    });
    assert.equal(adminView.status, 200, JSON.stringify(adminView.body));
    assert.ok(adminView.body.data.items.some((row) => row.status === 'LATE'));
  });

  it('outsider teacher cannot mark attendance for an unassigned class', async () => {
    const res = await outsider(request(app).post('/api/v1/teacher/attendance')).send({
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      attendanceDate: '2037-10-07',
      status: 'ABSENT',
    });
    assert.ok([403, 404].includes(res.status), JSON.stringify(res.body));
  });

  it('teacher→student assignment: create, submit, grade; unpublished exam hidden until publish', async () => {
    const created = await teacher(request(app).post('/api/v1/teacher/assignments')).send({
      title: 'XPortal Lab Report',
      description: 'Write findings',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      maxScore: 50,
      isPublished: true,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const assignmentId = created.body.data.assignment.id;

    const list = await student(request(app).get('/api/v1/student/assignments'));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((row) => row.id === assignmentId));

    const submit = await student(
      request(app).post(`/api/v1/student/assignments/${assignmentId}/submit`)
    ).send({ content: 'Lab notes' });
    assert.equal(submit.status, 201, JSON.stringify(submit.body));

    const submissions = await teacher(
      request(app).get(`/api/v1/teacher/assignments/${assignmentId}/submissions`)
    );
    assert.equal(submissions.status, 200);
    const submissionId = submissions.body.data.items[0].id;

    const graded = await teacher(
      request(app).patch(
        `/api/v1/teacher/assignments/${assignmentId}/submissions/${submissionId}/grade`
      )
    ).send({ score: 44, feedback: 'Solid work', status: 'GRADED' });
    assert.equal(graded.status, 200, JSON.stringify(graded.body));
    assert.equal(graded.body.data.submission.score, 44);

    const examRes = await admin(request(app).post(`${API}/examinations`)).send({
      name: 'XPortal Quiz',
      examType: 'QUIZ',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      academicYearId: ctx.year.id,
      maxScore: 20,
    });
    assert.equal(examRes.status, 201, JSON.stringify(examRes.body));
    const examId = examRes.body.data.examination.id;

    const scores = await teacher(request(app).put(`/api/v1/teacher/examinations/${examId}/results`)).send({
      results: [{ studentId: ctx.student.id, score: 19, gradeLetter: 'A' }],
    });
    assert.equal(scores.status, 200, JSON.stringify(scores.body));

    const hidden = await student(request(app).get('/api/v1/student/exam-results'));
    assert.equal(hidden.status, 200);
    assert.equal(
      hidden.body.data.items.filter((row) => row.examId === examId || row.exam?.id === examId).length,
      0,
      'unpublished exam results must stay hidden'
    );

    const publish = await admin(request(app).post(`${API}/examinations/${examId}/publish`));
    assert.equal(publish.status, 200, JSON.stringify(publish.body));

    const visible = await student(request(app).get('/api/v1/student/exam-results'));
    assert.equal(visible.status, 200);
    assert.ok(
      visible.body.data.items.some(
        (row) => Number(row.score) === 19 || Number(row.score) === 19.0
      )
    );
  });

  it('admin announcements: audience isolation between student and teacher portals', async () => {
    const forStudents = await admin(request(app).post(`${API}/announcements`)).send({
      title: 'XPortal Students Only',
      body: 'Hello learners',
      audience: 'STUDENTS',
    });
    assert.equal(forStudents.status, 201, JSON.stringify(forStudents.body));
    const studentAnnouncementId = forStudents.body.data.announcement.id;
    await admin(request(app).post(`${API}/announcements/${studentAnnouncementId}/publish`));

    const forTeachers = await admin(request(app).post(`${API}/announcements`)).send({
      title: 'XPortal Teachers Only',
      body: 'Hello staff',
      audience: 'TEACHERS',
    });
    assert.equal(forTeachers.status, 201, JSON.stringify(forTeachers.body));
    const teacherAnnouncementId = forTeachers.body.data.announcement.id;
    await admin(request(app).post(`${API}/announcements/${teacherAnnouncementId}/publish`));

    const studentList = await student(request(app).get('/api/v1/student/announcements'));
    assert.equal(studentList.status, 200);
    const studentIds = studentList.body.data.items.map((row) => row.id);
    assert.ok(studentIds.includes(studentAnnouncementId));
    assert.ok(!studentIds.includes(teacherAnnouncementId));

    const teacherList = await request(app)
      .get('/api/v1/teacher/announcements')
      .set('Authorization', `Bearer ${teacherToken}`);
    assert.equal(teacherList.status, 200, JSON.stringify(teacherList.body));
    const teacherIds = teacherList.body.data.items.map((row) => row.id);
    assert.ok(teacherIds.includes(teacherAnnouncementId));
    assert.ok(!teacherIds.includes(studentAnnouncementId));
  });

  it('student cannot mutate exam results via teacher API', async () => {
    const exam = await prisma.examination.findFirst({
      where: { name: 'XPortal Quiz', deletedAt: null },
    });
    assert.ok(exam);
    const res = await student(request(app).put(`/api/v1/teacher/examinations/${exam.id}/results`)).send({
      results: [{ studentId: ctx.student.id, score: 1 }],
    });
    assert.equal(res.status, 401);
  });
});
