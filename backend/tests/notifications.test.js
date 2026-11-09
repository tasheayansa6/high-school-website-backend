/**
 * Notifications module: creation, ownership, mark-read, isolation, event hooks.
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
const notificationService = require('../src/services/sms/notification.service');
const notificationEvents = require('../src/services/sms/notification.events');

const PASSWORD = 'Notify99!';
const PREFIX = 'sms.notif';
const CODE = 'NTF';
const ADMIN = `${PREFIX}.admin@example.com`;
const OTHER_ADMIN = `${PREFIX}.admin2@example.com`;
const API = '/api/v1/admin/sms';

async function cleanup() {
  const teacherIds = (
    await prisma.teacher.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const studentIds = (
    await prisma.student.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } })
  ).map((r) => r.id);
  const adminIds = (
    await prisma.admin.findMany({
      where: { email: { in: [ADMIN, OTHER_ADMIN] } },
      select: { id: true },
    })
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

  await prisma.notification.deleteMany({
    where: {
      OR: [
        { adminId: { in: adminIds } },
        { teacherId: { in: teacherIds } },
        { studentId: { in: studentIds } },
        { dedupeKey: { startsWith: 'test.notif' } },
      ],
    },
  });

  const assignmentIds = (
    await prisma.assignment.findMany({
      where: { OR: [{ teacherId: { in: teacherIds } }, { classOfferingId: { in: classIds } }] },
      select: { id: true },
    })
  ).map((r) => r.id);
  if (assignmentIds.length) {
    await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
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
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await prisma.admin.deleteMany({ where: { id: { in: adminIds } } });
}

describe('Notifications module', () => {
  const ctx = {};
  let adminToken;
  let otherAdminToken;
  let teacherToken;
  let otherTeacherToken;
  let studentToken;
  let otherStudentToken;

  const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const otherAdmin = (req) => req.set('Authorization', `Bearer ${otherAdminToken}`);
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
        firstName: 'Notify',
        lastName: 'Admin',
        roleId: superRole.id,
      },
    });
    await prisma.admin.create({
      data: {
        email: OTHER_ADMIN,
        passwordHash: await hashPassword(PASSWORD),
        firstName: 'Other',
        lastName: 'Admin',
        roleId: superRole.id,
      },
    });

    const login = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN, password: PASSWORD });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;

    const otherLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: OTHER_ADMIN, password: PASSWORD });
    assert.equal(otherLogin.status, 200);
    otherAdminToken = otherLogin.body.data.accessToken;

    const post = async (path, body) => {
      const res = await admin(request(app).post(`${API}${path}`)).send(body);
      assert.equal(res.status, 201, `${path}: ${JSON.stringify(res.body)}`);
      return res.body.data;
    };

    ctx.year = (
      await post('/academic-years', {
        name: 'Notify Year',
        code: `${CODE}-Y`,
        startsOn: '2037-09-01',
        endsOn: '2038-06-30',
      })
    ).academicYear;
    ctx.grade = (await post('/grade-levels', { name: 'Grade N', code: `${CODE}-G`, sortOrder: 91 }))
      .gradeLevel;
    ctx.section = (await post('/sections', { name: 'N1', code: `${CODE}-S` })).section;
    ctx.subject = (await post('/subjects', { name: 'Notify Science', code: `${CODE}-SCI` })).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'Notify',
        lastName: 'Teacher',
        employeeCode: `${CODE}-T1`,
      })
    ).teacher;
    ctx.otherTeacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher2@example.com`,
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
        homeroomTeacherId: ctx.teacher.id,
      })
    ).classOffering;
    ctx.student = (
      await post('/students', {
        email: `${PREFIX}.student@example.com`,
        password: PASSWORD,
        firstName: 'Notify',
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

    const teacherLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD });
    assert.equal(teacherLogin.status, 200);
    teacherToken = teacherLogin.body.data.accessToken;

    const otherTeacherLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: `${PREFIX}.teacher2@example.com`, password: PASSWORD });
    assert.equal(otherTeacherLogin.status, 200);
    otherTeacherToken = otherTeacherLogin.body.data.accessToken;

    const studentLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-S1`, password: PASSWORD });
    assert.equal(studentLogin.status, 200);
    studentToken = studentLogin.body.data.accessToken;

    const otherStudentLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode: `${CODE}-S2`, password: PASSWORD });
    assert.equal(otherStudentLogin.status, 200);
    otherStudentToken = otherStudentLogin.body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('creates notifications for recipients and skips duplicates', async () => {
    const created = await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id, ctx.otherStudent.id, 999999],
      title: 'Test notify',
      message: 'Hello students',
      category: 'ACADEMIC',
      dedupeKey: `test.notif.create:${ctx.student.id}`,
      actionPath: '/student/assignments',
    });
    assert.equal(created.created, 2);

    const again = await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id, ctx.otherStudent.id],
      title: 'Test notify',
      message: 'Hello students',
      category: 'ACADEMIC',
      dedupeKey: `test.notif.create:${ctx.student.id}`,
    });
    assert.equal(again.created, 0);
  });

  it('lists, filters, paginates, and returns unread count for the authenticated student', async () => {
    const unread = await student(request(app).get('/api/v1/student/notifications/unread-count'));
    assert.equal(unread.status, 200);
    assert.ok(unread.body.data.unreadCount >= 1);

    const list = await student(
      request(app).get('/api/v1/student/notifications').query({ category: 'ACADEMIC', limit: 5 })
    );
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.length >= 1);
    assert.ok(list.body.data.items.every((n) => n.studentId === ctx.student.id));
    assert.ok(list.body.data.pagination.total >= 1);
  });

  it('marks one notification as read and mark-all as read', async () => {
    const list = await student(request(app).get('/api/v1/student/notifications').query({ isRead: false }));
    const target = list.body.data.items[0];
    assert.ok(target);

    const marked = await student(request(app).post(`/api/v1/student/notifications/${target.id}/read`));
    assert.equal(marked.status, 200);
    assert.equal(marked.body.data.notification.isRead, true);

    await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id],
      title: 'Second',
      message: 'Another',
      category: 'ATTENDANCE',
      dedupeKey: `test.notif.second:${ctx.student.id}`,
    });

    const all = await student(request(app).post('/api/v1/student/notifications/read-all'));
    assert.equal(all.status, 200);
    assert.ok(all.body.data.updated >= 1);

    const unread = await student(request(app).get('/api/v1/student/notifications/unread-count'));
    assert.equal(unread.body.data.unreadCount, 0);
  });

  it('archives and soft-deletes owned notifications', async () => {
    const created = await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id],
      title: 'Archive me',
      message: 'Temp',
      category: 'ANNOUNCEMENT',
      dedupeKey: `test.notif.archive:${ctx.student.id}`,
    });
    assert.equal(created.created, 1);

    const list = await student(
      request(app).get('/api/v1/student/notifications').query({ category: 'ANNOUNCEMENT' })
    );
    const item = list.body.data.items.find((n) => n.dedupeKey.includes('archive'));
    assert.ok(item);

    const archived = await student(request(app).post(`/api/v1/student/notifications/${item.id}/archive`));
    assert.equal(archived.status, 200);
    assert.ok(archived.body.data.notification.archivedAt);

    const created2 = await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id],
      title: 'Delete me',
      message: 'Temp',
      category: 'ANNOUNCEMENT',
      dedupeKey: `test.notif.delete:${ctx.student.id}`,
    });
    assert.equal(created2.created, 1);
    const list2 = await student(
      request(app).get('/api/v1/student/notifications').query({ category: 'ANNOUNCEMENT' })
    );
    const item2 = list2.body.data.items.find((n) => n.dedupeKey.includes('delete'));
    const removed = await student(request(app).delete(`/api/v1/student/notifications/${item2.id}`));
    assert.equal(removed.status, 200);
    assert.ok(removed.body.data.notification.deletedAt);
  });

  it('prevents students from accessing another student notification', async () => {
    await notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [ctx.student.id],
      title: 'Private',
      message: 'Mine only',
      category: 'ACADEMIC',
      dedupeKey: `test.notif.private:${ctx.student.id}`,
    });
    const list = await student(request(app).get('/api/v1/student/notifications'));
    const mine = list.body.data.items[0];

    const denied = await otherStudent(request(app).get(`/api/v1/student/notifications/${mine.id}`));
    assert.equal(denied.status, 404);

    const deniedRead = await otherStudent(
      request(app).post(`/api/v1/student/notifications/${mine.id}/read`)
    );
    assert.equal(deniedRead.status, 404);

    const deniedDelete = await otherStudent(
      request(app).delete(`/api/v1/student/notifications/${mine.id}`)
    );
    assert.equal(deniedDelete.status, 404);
  });

  it('prevents admins from reading another admin notification', async () => {
    const adminRow = await prisma.admin.findUnique({ where: { email: ADMIN } });
    await notificationService.createForRecipients({
      recipientType: 'ADMIN',
      recipientIds: [adminRow.id],
      title: 'Admin only',
      message: 'Private admin note',
      category: 'ADMINISTRATION',
      dedupeKey: 'test.notif.admin.private',
    });
    const list = await admin(request(app).get('/api/v1/admin/notifications'));
    const item = list.body.data.items.find((n) => n.dedupeKey === 'test.notif.admin.private');
    assert.ok(item);

    const denied = await otherAdmin(request(app).get(`/api/v1/admin/notifications/${item.id}`));
    assert.equal(denied.status, 404);
  });

  it('emits assignment published notifications to enrolled students only', async () => {
    const assignmentRes = await teacher(request(app).post('/api/v1/teacher/assignments')).send({
      title: `${CODE} Homework`,
      description: 'Notify test',
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
      maxScore: 10,
      isPublished: true,
    });
    assert.equal(assignmentRes.status, 201, assignmentRes.body.message);
    ctx.assignment = assignmentRes.body.data.assignment;

    const studentList = await student(
      request(app).get('/api/v1/student/notifications').query({ category: 'ACADEMIC' })
    );
    assert.ok(
      studentList.body.data.items.some((n) => n.dedupeKey === `assignment.published:${ctx.assignment.id}`)
    );

    const otherList = await otherStudent(
      request(app).get('/api/v1/student/notifications').query({ category: 'ACADEMIC' })
    );
    assert.ok(
      !otherList.body.data.items.some((n) => n.dedupeKey === `assignment.published:${ctx.assignment.id}`)
    );
  });

  it('emits submission notification to the responsible teacher only', async () => {
    const submit = await student(
      request(app).post(`/api/v1/student/assignments/${ctx.assignment.id}/submit`)
    ).send({ content: 'My work' });
    assert.equal(submit.status, 201, submit.body.message);

    const teacherList = await teacher(
      request(app).get('/api/v1/teacher/notifications').query({ category: 'ACADEMIC' })
    );
    assert.ok(
      teacherList.body.data.items.some(
        (n) => n.dedupeKey === `assignment.submitted:${ctx.assignment.id}:${ctx.student.id}`
      )
    );

    const otherList = await otherTeacher(
      request(app).get('/api/v1/teacher/notifications').query({ category: 'ACADEMIC' })
    );
    assert.ok(
      !otherList.body.data.items.some(
        (n) => n.dedupeKey === `assignment.submitted:${ctx.assignment.id}:${ctx.student.id}`
      )
    );
  });

  it('does not create notifications when the emitter is called with incomplete data', async () => {
    const before = await prisma.notification.count();
    const result = await notificationEvents.notifyAssignmentPublished({ id: null, isPublished: true });
    assert.equal(result, null);
    const after = await prisma.notification.count();
    assert.equal(after, before);
  });

  it('requires authentication for notification endpoints', async () => {
    const res = await request(app).get('/api/v1/student/notifications');
    assert.equal(res.status, 401);
  });
});
