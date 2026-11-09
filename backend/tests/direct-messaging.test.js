/**
 * Direct messaging: eligibility, isolation, unread, notifications.
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

const PASSWORD = 'DirectMsg99!';
const PREFIX = 'sms.dm';
const CODE = 'DMG';
const ADMIN = `${PREFIX}.admin@example.com`;
const API = '/api/v1/admin/sms';

async function cleanup() {
  const teacherIds = (
    await prisma.teacher.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const studentIds = (
    await prisma.student.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const adminIds = (
    await prisma.admin.findMany({ where: { email: ADMIN }, select: { id: true } })
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

  const participantScopes = [
    ...adminIds.map((id) => `ADMIN:${id}`),
    ...teacherIds.map((id) => `TEACHER:${id}`),
    ...studentIds.map((id) => `STUDENT:${id}`),
  ];
  if (participantScopes.length) {
    const convIds = (
      await prisma.conversationParticipant.findMany({
        where: { participantScopeKey: { in: participantScopes } },
        select: { conversationId: true },
      })
    ).map((r) => r.conversationId);
    if (convIds.length) {
      await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
      await prisma.conversationParticipant.deleteMany({
        where: { conversationId: { in: convIds } },
      });
      await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
    }
  }

  await prisma.notification.deleteMany({
    where: {
      OR: [
        { adminId: { in: adminIds } },
        { teacherId: { in: teacherIds } },
        { studentId: { in: studentIds } },
        { category: 'MESSAGING' },
      ],
    },
  });

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
  await prisma.admin.deleteMany({ where: { id: { in: adminIds } } });
}

describe('Direct messaging module', () => {
  const ctx = {};
  let adminToken;
  let teacherToken;
  let outsiderTeacherToken;
  let studentToken;
  let otherStudentToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const teacher = (req) => req.set('Authorization', `Bearer ${teacherToken}`);
  const outsiderTeacher = (req) => req.set('Authorization', `Bearer ${outsiderTeacherToken}`);
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
        firstName: 'DM',
        lastName: 'Admin',
        roleId: superRole.id,
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
        name: 'DM Year',
        code: `${CODE}-Y`,
        startsOn: '2039-09-01',
        endsOn: '2040-06-30',
      })
    ).academicYear;
    ctx.grade = (await post('/grade-levels', { name: 'Grade DM', code: `${CODE}-G`, sortOrder: 92 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'DM1', code: `${CODE}-S` })).section;
    ctx.subject = (await post('/subjects', { name: 'DM Science', code: `${CODE}-SCI` })).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'DM',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T1`,
      })
    ).teacher;
    ctx.outsider = (
      await post('/teachers', {
        email: `${PREFIX}.outsider@example.com`,
        password: PASSWORD,
        firstName: 'Out',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T2`,
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
        firstName: 'DM',
        lastName: 'Student',
        studentCode: `${CODE}-S1`,
      })
    ).student;
    ctx.otherStudent = (
      await post('/students', {
        email: `${PREFIX}.student2@example.com`,
        password: PASSWORD,
        firstName: 'Other',
        lastName: 'Student',
        studentCode: `${CODE}-S2`,
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

    teacherToken = (
      await request(app)
        .post('/api/v1/teacher/auth/login')
        .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD })
    ).body.data.accessToken;
    outsiderTeacherToken = (
      await request(app)
        .post('/api/v1/teacher/auth/login')
        .send({ email: `${PREFIX}.outsider@example.com`, password: PASSWORD })
    ).body.data.accessToken;
    studentToken = (
      await request(app)
        .post('/api/v1/student/auth/login')
        .send({ studentCode: `${CODE}-S1`, password: PASSWORD })
    ).body.data.accessToken;
    otherStudentToken = (
      await request(app)
        .post('/api/v1/student/auth/login')
        .send({ studentCode: `${CODE}-S2`, password: PASSWORD })
    ).body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('admin can message an authorized teacher and student', async () => {
    const withTeacher = await admin(request(app).post('/api/v1/admin/messages/conversations')).send({
      peerType: 'TEACHER',
      peerId: ctx.teacher.id,
    });
    assert.equal(withTeacher.status, 201, withTeacher.body.message);
    ctx.adminTeacherConv = withTeacher.body.data.conversation.id;

    const msg = await admin(
      request(app).post(`/api/v1/admin/messages/conversations/${ctx.adminTeacherConv}/messages`)
    ).send({ body: 'Hello teacher' });
    assert.equal(msg.status, 201, msg.body.message);
    assert.equal(msg.body.data.message.body, 'Hello teacher');
    assert.equal(msg.body.data.message.adminId, (await prisma.admin.findUnique({ where: { email: ADMIN } })).id);

    const withStudent = await admin(request(app).post('/api/v1/admin/messages/conversations')).send({
      peerType: 'STUDENT',
      peerId: ctx.student.id,
    });
    assert.equal(withStudent.status, 201, withStudent.body.message);
  });

  it('teacher can message site admin and find admin contacts by email', async () => {
    const adminUser = await prisma.admin.findUnique({ where: { email: ADMIN } });
    assert.ok(adminUser);

    const contacts = await teacher(request(app).get('/api/v1/teacher/messages/contacts')).query({
      q: ADMIN,
    });
    assert.equal(contacts.status, 200, contacts.body.message);
    const adminHits = (contacts.body.data.items || []).filter(
      (item) => item.type === 'ADMIN' && item.id === adminUser.id
    );
    assert.equal(adminHits.length, 1);
    assert.equal(adminHits[0].email, ADMIN);

    const started = await teacher(request(app).post('/api/v1/teacher/messages/conversations')).send({
      peerType: 'ADMIN',
      peerId: adminUser.id,
    });
    assert.equal(started.status, 201, started.body.message);
    // Same pair as admin→teacher conversation already created above.
    assert.equal(started.body.data.conversation.id, ctx.adminTeacherConv);

    const sent = await teacher(
      request(app).post(
        `/api/v1/teacher/messages/conversations/${ctx.adminTeacherConv}/messages`
      )
    ).send({ body: 'Hello site admin from teacher' });
    assert.equal(sent.status, 201, sent.body.message);
    assert.equal(sent.body.data.message.senderType, 'TEACHER');
  });

  it('teacher can message assigned student but not unrelated student', async () => {
    const ok = await teacher(request(app).post('/api/v1/teacher/messages/conversations')).send({
      peerType: 'STUDENT',
      peerId: ctx.student.id,
    });
    assert.equal(ok.status, 201, ok.body.message);
    ctx.teacherStudentConv = ok.body.data.conversation.id;

    const denied = await teacher(request(app).post('/api/v1/teacher/messages/conversations')).send({
      peerType: 'STUDENT',
      peerId: ctx.otherStudent.id,
    });
    assert.equal(denied.status, 403);

    const outsiderDenied = await outsiderTeacher(
      request(app).post('/api/v1/teacher/messages/conversations')
    ).send({ peerType: 'STUDENT', peerId: ctx.student.id });
    assert.equal(outsiderDenied.status, 403);
  });

  it('student can message eligible teacher and cannot message another student', async () => {
    const ok = await student(request(app).post('/api/v1/student/messages/conversations')).send({
      peerType: 'TEACHER',
      peerId: ctx.teacher.id,
    });
    assert.equal(ok.status, 201, ok.body.message);
    // Same pair as teacher→student conversation
    assert.equal(ok.body.data.conversation.id, ctx.teacherStudentConv);

    const denied = await student(request(app).post('/api/v1/student/messages/conversations')).send({
      peerType: 'STUDENT',
      peerId: ctx.otherStudent.id,
    });
    assert.equal(denied.status, 403);
  });

  it('rejects empty messages and enforces length', async () => {
    const empty = await teacher(
      request(app).post(`/api/v1/teacher/messages/conversations/${ctx.teacherStudentConv}/messages`)
    ).send({ body: '   ' });
    assert.equal(empty.status, 422);

    const tooLong = await teacher(
      request(app).post(`/api/v1/teacher/messages/conversations/${ctx.teacherStudentConv}/messages`)
    ).send({ body: 'x'.repeat(2001) });
    assert.equal(tooLong.status, 422);
  });

  it('unauthorized users cannot read or send in another conversation', async () => {
    const deniedGet = await otherStudent(
      request(app).get(`/api/v1/student/messages/conversations/${ctx.teacherStudentConv}`)
    );
    assert.equal(deniedGet.status, 404);

    const deniedSend = await otherStudent(
      request(app).post(`/api/v1/student/messages/conversations/${ctx.teacherStudentConv}/messages`)
    ).send({ body: 'Hijack' });
    assert.equal(deniedSend.status, 404);

    const deniedOutsider = await outsiderTeacher(
      request(app).get(`/api/v1/teacher/messages/conversations/${ctx.adminTeacherConv}`)
    );
    assert.equal(deniedOutsider.status, 404);
  });

  it('sender identity cannot be spoofed via body fields', async () => {
    const before = await prisma.message.count({ where: { conversationId: ctx.teacherStudentConv } });
    const spoof = await student(
      request(app).post(`/api/v1/student/messages/conversations/${ctx.teacherStudentConv}/messages`)
    ).send({
      body: 'From student',
      senderType: 'ADMIN',
      adminId: 1,
      teacherId: ctx.teacher.id,
    });
    assert.equal(spoof.status, 201, spoof.body.message);
    assert.equal(spoof.body.data.message.senderType, 'STUDENT');
    assert.equal(spoof.body.data.message.studentId, ctx.student.id);
    assert.equal(spoof.body.data.message.adminId, null);
    const after = await prisma.message.count({ where: { conversationId: ctx.teacherStudentConv } });
    assert.equal(after, before + 1);
  });

  it('unread counts and mark-read work; notifications fire without duplicates', async () => {
    // Teacher sends to student → student unread + notification
    const sent = await teacher(
      request(app).post(`/api/v1/teacher/messages/conversations/${ctx.teacherStudentConv}/messages`)
    ).send({ body: 'Please submit homework' });
    assert.equal(sent.status, 201);
    const messageId = sent.body.data.message.id;

    const unread = await student(request(app).get('/api/v1/student/messages/unread-count'));
    assert.equal(unread.status, 200);
    assert.ok(unread.body.data.unreadCount >= 1);

    const notif = await prisma.notification.findFirst({
      where: {
        studentId: ctx.student.id,
        dedupeKey: `messaging.message:${messageId}`,
        category: 'MESSAGING',
      },
    });
    assert.ok(notif);

    // Retry emit path via duplicate dedupe key should not create another
    const notificationEvents = require('../src/services/sms/notification.events');
    await notificationEvents.notifyDirectMessageReceived({
      message: sent.body.data.message,
      recipientType: 'STUDENT',
      recipientId: ctx.student.id,
    });
    const count = await prisma.notification.count({
      where: { dedupeKey: `messaging.message:${messageId}` },
    });
    assert.equal(count, 1);

    const marked = await student(
      request(app).post(`/api/v1/student/messages/conversations/${ctx.teacherStudentConv}/read`)
    );
    assert.equal(marked.status, 200);

    const unreadAfter = await student(request(app).get('/api/v1/student/messages/unread-count'));
    assert.equal(unreadAfter.body.data.unreadCount, 0);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/student/messages/conversations');
    assert.equal(res.status, 401);
  });
});
