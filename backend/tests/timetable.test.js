/**
 * Timetable module: CRUD, conflicts, publication, teacher/student isolation.
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

const PASSWORD = 'Timetable99!';
const PREFIX = 'sms.ttable';
const CODE = 'TTBL';
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
  const timetableIds = (
    await prisma.timetable.findMany({
      where: { OR: [{ classOfferingId: { in: classIds } }, { academicYearId: { in: yearIds } }] },
      select: { id: true },
    })
  ).map((r) => r.id);

  if (timetableIds.length) {
    await prisma.timetableEntry.deleteMany({ where: { timetableId: { in: timetableIds } } });
    await prisma.timetable.deleteMany({ where: { id: { in: timetableIds } } });
  }
  await prisma.classroom.deleteMany({ where: { code: { startsWith: CODE } } });
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
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await prisma.admin.deleteMany({ where: { email: ADMIN } });
}

describe('Timetable module', () => {
  const ctx = {};
  let adminToken;
  let teacherToken;
  let otherTeacherToken;
  let studentToken;
  let otherStudentToken;

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
        firstName: 'TT',
        lastName: 'Admin',
        roleId: role.id,
      },
    });

    const login = await request(app).post('/api/v1/admin/auth/login').send({
      email: ADMIN,
      password: PASSWORD,
    });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;

    const post = async (path, body) => {
      const res = await admin(request(app).post(`${API}${path}`)).send(body);
      assert.equal(res.status, 201, JSON.stringify(res.body));
      return res.body.data;
    };

    ctx.year = (
      await post('/academic-years', {
        name: 'TT Year',
        code: `${CODE}-Y`,
        startsOn: '2039-09-01',
        endsOn: '2040-06-30',
      })
    ).academicYear;
    ctx.term = (
      await admin(request(app).post(`${API}/academic-years/${ctx.year.id}/terms`)).send({
        name: 'Term 1',
        sequence: 1,
        startsOn: '2039-09-01',
        endsOn: '2039-12-20',
      })
    ).body.data?.academicTerm;
    if (!ctx.term) {
      // Fallback if nested route differs — create via prisma
      ctx.term = await prisma.academicTerm.create({
        data: {
          academicYearId: ctx.year.id,
          name: 'Term 1',
          sequence: 1,
          startsOn: new Date('2039-09-01'),
          endsOn: new Date('2039-12-20'),
        },
      });
    }

    ctx.grade = (await post('/grade-levels', { name: 'TT Grade', code: `${CODE}-G`, sortOrder: 50 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'T1', code: `${CODE}-S` })).section;
    ctx.subject = (await post('/subjects', { name: 'TT Maths', code: `${CODE}-M` })).subject;
    ctx.subject2 = (await post('/subjects', { name: 'TT Science', code: `${CODE}-SCI` })).subject;

    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'TT',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T1`,
      })
    ).teacher;
    ctx.otherTeacher = (
      await post('/teachers', {
        email: `${PREFIX}.other@example.com`,
        password: PASSWORD,
        firstName: 'Other',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T2`,
      })
    ).teacher;

    ctx.klass = (
      await post('/class-offerings', {
        academicYearId: ctx.year.id,
        gradeLevelId: ctx.grade.id,
        sectionId: ctx.section.id,
      })
    ).classOffering;
    ctx.klass2 = (
      await post('/class-offerings', {
        academicYearId: ctx.year.id,
        gradeLevelId: ctx.grade.id,
        sectionId: (
          await post('/sections', { name: 'T2', code: `${CODE}-S2` })
        ).section.id,
      })
    ).classOffering;

    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
    });
    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass2.id,
      subjectId: ctx.subject.id,
    });
    await post('/teaching-assignments', {
      teacherId: ctx.otherTeacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject2.id,
    });

    ctx.student = (
      await post('/students', {
        email: `${PREFIX}.student@example.com`,
        password: PASSWORD,
        firstName: 'TT',
        lastName: 'Student',
        studentCode: `${CODE}-ST1`,
      })
    ).student;
    ctx.otherStudent = (
      await post('/students', {
        email: `${PREFIX}.student2@example.com`,
        password: PASSWORD,
        firstName: 'Other',
        lastName: 'Student',
        studentCode: `${CODE}-ST2`,
      })
    ).student;

    await post('/enrollments', {
      studentId: ctx.student.id,
      classOfferingId: ctx.klass.id,
      academicYearId: ctx.year.id,
    });

    ctx.room = (
      await admin(request(app).post(`${API}/timetables/classrooms`)).send({
        name: 'Lab A',
        code: `${CODE}-R1`,
        capacity: 30,
      })
    ).body.data.classroom;
    assert.ok(ctx.room?.id);

    const tLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD });
    assert.equal(tLogin.status, 200);
    teacherToken = tLogin.body.data.accessToken;

    const oLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.other@example.com`, password: PASSWORD });
    otherTeacherToken = oLogin.body.data.accessToken;

    const sLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: `${PREFIX}.student@example.com`, password: PASSWORD });
    studentToken = sLogin.body.data.accessToken;

    const s2 = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: `${PREFIX}.student2@example.com`, password: PASSWORD });
    otherStudentToken = s2.body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('admin creates a timetable and entry; persists in MySQL', async () => {
    const created = await admin(request(app).post(`${API}/timetables`)).send({
      academicYearId: ctx.year.id,
      classOfferingId: ctx.klass.id,
      title: 'TT Weekly',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ctx.timetableId = created.body.data.timetable.id;

    const entry = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '08:45',
      subjectId: ctx.subject.id,
      teacherId: ctx.teacher.id,
      classroomId: ctx.room.id,
    });
    assert.equal(entry.status, 201, JSON.stringify(entry.body));
    ctx.entryId = entry.body.data.entry.id;

    const row = await prisma.timetableEntry.findUnique({ where: { id: ctx.entryId } });
    assert.equal(row.startTime, '08:00');
    assert.equal(row.teacherId, ctx.teacher.id);
  });

  it('rejects invalid time range', async () => {
    const res = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'TUESDAY',
      startTime: '10:00',
      endTime: '09:00',
      subjectId: ctx.subject.id,
      teacherId: ctx.teacher.id,
    });
    assert.equal(res.status, 422);
  });

  it('rejects teacher double-booking conflict', async () => {
    const tt2 = await admin(request(app).post(`${API}/timetables`)).send({
      academicYearId: ctx.year.id,
      classOfferingId: ctx.klass2.id,
      title: 'TT Other class',
    });
    assert.equal(tt2.status, 201, JSON.stringify(tt2.body));
    ctx.timetable2Id = tt2.body.data.timetable.id;

    const conflict = await admin(
      request(app).post(`${API}/timetables/${ctx.timetable2Id}/entries`)
    ).send({
      dayOfWeek: 'MONDAY',
      startTime: '08:15',
      endTime: '09:00',
      subjectId: ctx.subject.id,
      teacherId: ctx.teacher.id,
    });
    assert.equal(conflict.status, 409, JSON.stringify(conflict.body));
    assert.equal(conflict.body.code, 'TIMETABLE_CONFLICT');
  });

  it('rejects classroom double-booking', async () => {
    const res = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'MONDAY',
      startTime: '08:30',
      endTime: '09:15',
      subjectId: ctx.subject2.id,
      teacherId: ctx.otherTeacher.id,
      classroomId: ctx.room.id,
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  it('rejects class double-booking', async () => {
    const res = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'MONDAY',
      startTime: '08:20',
      endTime: '09:00',
      subjectId: ctx.subject2.id,
      teacherId: ctx.otherTeacher.id,
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
  });

  it('rejects ineligible teacher for subject', async () => {
    const res = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'WEDNESDAY',
      startTime: '10:00',
      endTime: '10:45',
      subjectId: ctx.subject.id,
      teacherId: ctx.otherTeacher.id,
    });
    assert.equal(res.status, 422, JSON.stringify(res.body));
  });

  it('admin edits and deletes an entry', async () => {
    const updated = await admin(
      request(app).patch(`${API}/timetables/${ctx.timetableId}/entries/${ctx.entryId}`)
    ).send({ startTime: '08:00', endTime: '08:50' });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.entry.endTime, '08:50');

    const okSlot = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/entries`)).send({
      dayOfWeek: 'FRIDAY',
      startTime: '11:00',
      endTime: '11:45',
      subjectId: ctx.subject2.id,
      teacherId: ctx.otherTeacher.id,
    });
    assert.equal(okSlot.status, 201, JSON.stringify(okSlot.body));
    const delId = okSlot.body.data.entry.id;

    const deleted = await admin(
      request(app).delete(`${API}/timetables/${ctx.timetableId}/entries/${delId}`)
    );
    assert.equal(deleted.status, 200);
    const row = await prisma.timetableEntry.findUnique({ where: { id: delId } });
    assert.ok(row.deletedAt);
  });

  it('unpublished timetable is hidden from teacher and student', async () => {
    const teacherView = await teacher(request(app).get('/api/v1/teacher/timetable'));
    assert.equal(teacherView.status, 200);
    assert.equal(teacherView.body.data.items.length, 0);

    const studentView = await student(request(app).get('/api/v1/student/timetable'));
    assert.equal(studentView.status, 200);
    assert.equal(studentView.body.data.items.length, 0);
  });

  it('after publish, teacher and enrolled student see the timetable', async () => {
    const pub = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/publish`));
    assert.equal(pub.status, 200, JSON.stringify(pub.body));
    assert.equal(pub.body.data.timetable.isPublished, true);

    const teacherView = await teacher(request(app).get('/api/v1/teacher/timetable'));
    assert.equal(teacherView.status, 200);
    assert.ok(teacherView.body.data.items.some((e) => e.id === ctx.entryId));

    const otherTeacherView = await request(app)
      .get('/api/v1/teacher/timetable')
      .set('Authorization', `Bearer ${otherTeacherToken}`);
    assert.equal(otherTeacherView.status, 200);
    assert.ok(!otherTeacherView.body.data.items.some((e) => e.id === ctx.entryId));

    const studentView = await student(request(app).get('/api/v1/student/timetable'));
    assert.equal(studentView.status, 200);
    assert.ok(studentView.body.data.items.some((t) => t.id === ctx.timetableId));
    assert.ok(
      studentView.body.data.items
        .find((t) => t.id === ctx.timetableId)
        .entries.some((e) => e.id === ctx.entryId)
    );

    const otherStudentView = await request(app)
      .get('/api/v1/student/timetable')
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(otherStudentView.status, 200);
    assert.equal(otherStudentView.body.data.items.length, 0);
  });

  it('unpublish hides again; unauthorized access rejected', async () => {
    const un = await admin(request(app).post(`${API}/timetables/${ctx.timetableId}/unpublish`));
    assert.equal(un.status, 200);

    const teacherView = await teacher(request(app).get('/api/v1/teacher/timetable'));
    assert.equal(teacherView.body.data.items.length, 0);

    const noAuth = await request(app).get(`${API}/timetables`);
    assert.equal(noAuth.status, 401);

    const studentOnAdmin = await student(request(app).get(`${API}/timetables`));
    assert.equal(studentOnAdmin.status, 401);
  });
});
