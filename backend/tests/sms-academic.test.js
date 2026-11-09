const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'SmsPhase2Academic1';
const PREFIX = 'sms.phase2.academic';
const CODE_PREFIX = 'SMS2A';

const adminEmails = {
  super: `${PREFIX}.super@example.com`,
  editor: `${PREFIX}.editor@example.com`,
};
const teacherEmail = `${PREFIX}.teacher@example.com`;
const studentEmail = `${PREFIX}.student@example.com`;
const studentCode = `${CODE_PREFIX}-STU-001`;

const API = '/api/v1/admin/sms';

async function cleanup() {
  const studentIds = (
    await prisma.student.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    })
  ).map((row) => row.id);
  const teacherIds = (
    await prisma.teacher.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    })
  ).map((row) => row.id);
  const yearIds = (
    await prisma.academicYear.findMany({
      where: { code: { startsWith: CODE_PREFIX } },
      select: { id: true },
    })
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
  await prisma.academicTerm.deleteMany({ where: { academicYearId: { in: yearIds } } });
  await prisma.academicYear.deleteMany({ where: { id: { in: yearIds } } });
  await prisma.gradeLevel.deleteMany({ where: { code: { startsWith: CODE_PREFIX } } });
  await prisma.section.deleteMany({ where: { code: { startsWith: CODE_PREFIX } } });
  await prisma.subject.deleteMany({ where: { code: { startsWith: CODE_PREFIX } } });
  await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
  await prisma.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await prisma.admin.deleteMany({ where: { email: { in: Object.values(adminEmails) } } });
}

async function createAdmin(email, roleSlug) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  return prisma.admin.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      firstName: 'Phase2',
      lastName: 'Admin',
      roleId: role.id,
    },
  });
}

async function adminLogin(email) {
  const res = await request(app).post('/api/v1/admin/auth/login').send({ email, password: PASSWORD });
  assert.equal(res.status, 200);
  return res.body.data.accessToken;
}

describe('SMS Phase 2 academic structure and enrollment', () => {
  let token;
  let editorToken;
  const ctx = {};

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

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

    await createAdmin(adminEmails.super, ROLE_SLUGS.SUPER_ADMIN);
    await createAdmin(adminEmails.editor, ROLE_SLUGS.CONTENT_EDITOR);
    token = await adminLogin(adminEmails.super);
    editorToken = await adminLogin(adminEmails.editor);
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('requires authentication and SMS permissions', async () => {
    const unauth = await request(app).get(`${API}/teachers`);
    assert.equal(unauth.status, 401);

    const forbidden = await request(app)
      .get(`${API}/teachers`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.code, 'FORBIDDEN');

    const forbiddenYears = await request(app)
      .post(`${API}/academic-years`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    assert.equal(forbiddenYears.status, 403);
  });

  it('creates academic years, sets current atomically, and creates terms', async () => {
    const first = await auth(request(app).post(`${API}/academic-years`)).send({
      name: 'SMS Test Year 1',
      code: `${CODE_PREFIX}-Y1`,
      startsOn: '2026-09-01',
      endsOn: '2027-06-30',
      isCurrent: true,
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.academicYear.isCurrent, true);
    ctx.year = first.body.data.academicYear;

    const second = await auth(request(app).post(`${API}/academic-years`)).send({
      name: 'SMS Test Year 2',
      code: `${CODE_PREFIX}-Y2`,
      startsOn: '2027-09-01',
      endsOn: '2028-06-30',
    });
    assert.equal(second.status, 201);
    ctx.year2 = second.body.data.academicYear;

    const setCurrent = await auth(
      request(app).patch(`${API}/academic-years/${ctx.year2.id}/set-current`)
    );
    assert.equal(setCurrent.status, 200);
    assert.equal(setCurrent.body.data.academicYear.isCurrent, true);

    const firstAfter = await auth(request(app).get(`${API}/academic-years/${ctx.year.id}`));
    assert.equal(firstAfter.body.data.academicYear.isCurrent, false);

    const currentCount = await prisma.academicYear.count({ where: { isCurrent: true } });
    assert.equal(currentCount, 1);

    const dupCode = await auth(request(app).post(`${API}/academic-years`)).send({
      name: 'Dup',
      code: `${CODE_PREFIX}-Y1`,
      startsOn: '2026-09-01',
      endsOn: '2027-06-30',
    });
    assert.equal(dupCode.status, 409);
    assert.equal(dupCode.body.code, 'ACADEMIC_YEAR_CODE_CONFLICT');

    const badDates = await auth(request(app).post(`${API}/academic-years`)).send({
      name: 'Bad',
      code: `${CODE_PREFIX}-Y3`,
      startsOn: '2027-09-01',
      endsOn: '2026-09-01',
    });
    assert.equal(badDates.status, 422);

    const term = await auth(
      request(app).post(`${API}/academic-years/${ctx.year.id}/terms`)
    ).send({
      name: 'Term 1',
      sequence: 1,
      startsOn: '2026-09-01',
      endsOn: '2026-12-20',
    });
    assert.equal(term.status, 201);
    ctx.term = term.body.data.academicTerm;

    const dupTerm = await auth(
      request(app).post(`${API}/academic-years/${ctx.year.id}/terms`)
    ).send({ name: 'Term 1b', sequence: 1, startsOn: '2026-09-01', endsOn: '2026-12-20' });
    assert.equal(dupTerm.status, 409);

    const outside = await auth(
      request(app).post(`${API}/academic-years/${ctx.year.id}/terms`)
    ).send({ name: 'Out', sequence: 2, startsOn: '2025-01-01', endsOn: '2025-02-01' });
    assert.equal(outside.status, 422);

    const updatedTerm = await auth(
      request(app).patch(`${API}/academic-years/${ctx.year.id}/terms/${ctx.term.id}`)
    ).send({ name: 'Term One' });
    assert.equal(updatedTerm.status, 200);
    assert.equal(updatedTerm.body.data.academicTerm.name, 'Term One');

    const terms = await auth(request(app).get(`${API}/academic-years/${ctx.year.id}/terms`));
    assert.equal(terms.status, 200);
    assert.equal(terms.body.data.items.length, 1);
  });

  it('creates grade level, section, and subject', async () => {
    const grade = await auth(request(app).post(`${API}/grade-levels`)).send({
      name: 'Grade 9',
      code: `${CODE_PREFIX}-G9`,
      sortOrder: 9,
    });
    assert.equal(grade.status, 201);
    ctx.grade = grade.body.data.gradeLevel;

    const section = await auth(request(app).post(`${API}/sections`)).send({
      name: 'A',
      code: `${CODE_PREFIX}-A`,
    });
    assert.equal(section.status, 201);
    ctx.section = section.body.data.section;

    const subject = await auth(request(app).post(`${API}/subjects`)).send({
      name: 'Mathematics',
      code: `${CODE_PREFIX}-MATH`,
    });
    assert.equal(subject.status, 201);
    ctx.subject = subject.body.data.subject;

    const dup = await auth(request(app).post(`${API}/subjects`)).send({
      name: 'Math again',
      code: `${CODE_PREFIX}-MATH`,
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'SUBJECT_CODE_CONFLICT');

    const list = await auth(request(app).get(`${API}/grade-levels?q=${CODE_PREFIX}`));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.items.length, 1);
  });

  it('manages teachers and students without exposing passwordHash', async () => {
    const teacher = await auth(request(app).post(`${API}/teachers`)).send({
      email: teacherEmail.toUpperCase(),
      password: PASSWORD,
      firstName: 'Tess',
      lastName: 'Teacher',
    });
    assert.equal(teacher.status, 201);
    assert.equal(teacher.body.data.teacher.email, teacherEmail);
    assert.equal(teacher.body.data.teacher.passwordHash, undefined);
    ctx.teacher = teacher.body.data.teacher;

    const dupTeacher = await auth(request(app).post(`${API}/teachers`)).send({
      email: teacherEmail,
      password: PASSWORD,
      firstName: 'Dup',
      lastName: 'Teacher',
    });
    assert.equal(dupTeacher.status, 409);
    assert.equal(dupTeacher.body.code, 'TEACHER_EMAIL_CONFLICT');

    const student = await auth(request(app).post(`${API}/students`)).send({
      email: studentEmail,
      password: PASSWORD,
      firstName: 'Sam',
      lastName: 'Student',
      studentCode,
      dateOfBirth: '2010-05-04',
    });
    assert.equal(student.status, 201);
    assert.equal(student.body.data.student.studentCode, studentCode);
    assert.equal(student.body.data.student.passwordHash, undefined);
    ctx.student = student.body.data.student;

    const missingCode = await auth(request(app).post(`${API}/students`)).send({
      email: `${PREFIX}.nocode@example.com`,
      password: PASSWORD,
      firstName: 'No',
      lastName: 'Code',
    });
    assert.equal(missingCode.status, 422);

    const dupCode = await auth(request(app).post(`${API}/students`)).send({
      email: `${PREFIX}.dupcode@example.com`,
      password: PASSWORD,
      firstName: 'Dup',
      lastName: 'Code',
      studentCode,
    });
    assert.equal(dupCode.status, 409);
    assert.equal(dupCode.body.code, 'STUDENT_CODE_CONFLICT');

    const list = await auth(request(app).get(`${API}/teachers?q=${PREFIX}`));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.items.length, 1);
    assert.equal(list.body.data.items[0].passwordHash, undefined);
    assert.equal(list.body.data.pagination.total, 1);

    const get = await auth(request(app).get(`${API}/students/${ctx.student.id}`));
    assert.equal(get.status, 200);
    assert.equal(get.body.data.student.passwordHash, undefined);

    const update = await auth(request(app).patch(`${API}/students/${ctx.student.id}`)).send({
      guardianName: 'Guardian',
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.student.guardianName, 'Guardian');
  });

  it('creates class offering with auto-generated name and rejects duplicates', async () => {
    const res = await auth(request(app).post(`${API}/class-offerings`)).send({
      academicYearId: ctx.year.id,
      gradeLevelId: ctx.grade.id,
      sectionId: ctx.section.id,
      homeroomTeacherId: ctx.teacher.id,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.classOffering.name, `Grade 9 A (${CODE_PREFIX}-Y1)`);
    assert.equal(res.body.data.classOffering.homeroomTeacher.id, ctx.teacher.id);
    assert.equal(res.body.data.classOffering.homeroomTeacher.passwordHash, undefined);
    ctx.classOffering = res.body.data.classOffering;

    const dup = await auth(request(app).post(`${API}/class-offerings`)).send({
      academicYearId: ctx.year.id,
      gradeLevelId: ctx.grade.id,
      sectionId: ctx.section.id,
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'CLASS_OFFERING_CONFLICT');

    const list = await auth(
      request(app).get(`${API}/class-offerings?academicYearId=${ctx.year.id}`)
    );
    assert.equal(list.status, 200);
    assert.equal(list.body.data.items.length, 1);
  });

  it('assigns a teacher and rejects duplicate assignments (year + term scope)', async () => {
    const body = {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.classOffering.id,
      subjectId: ctx.subject.id,
    };

    const created = await auth(request(app).post(`${API}/teaching-assignments`)).send(body);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.teachingAssignment.termScopeKey, 'YEAR');
    ctx.assignment = created.body.data.teachingAssignment;

    const dup = await auth(request(app).post(`${API}/teaching-assignments`)).send(body);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'TEACHING_ASSIGNMENT_DUPLICATE');

    const termScoped = await auth(request(app).post(`${API}/teaching-assignments`)).send({
      ...body,
      academicTermId: ctx.term.id,
    });
    assert.equal(termScoped.status, 201);
    assert.equal(termScoped.body.data.teachingAssignment.termScopeKey, String(ctx.term.id));

    const dupTerm = await auth(request(app).post(`${API}/teaching-assignments`)).send({
      ...body,
      academicTermId: ctx.term.id,
    });
    assert.equal(dupTerm.status, 409);

    // Terms from another academic year are rejected.
    const otherTerm = await auth(
      request(app).post(`${API}/academic-years/${ctx.year2.id}/terms`)
    ).send({ name: 'Y2 T1', sequence: 1, startsOn: '2027-09-01', endsOn: '2027-12-20' });
    assert.equal(otherTerm.status, 201);
    const mismatch = await auth(request(app).post(`${API}/teaching-assignments`)).send({
      ...body,
      academicTermId: otherTerm.body.data.academicTerm.id,
    });
    assert.equal(mismatch.status, 422);

    // Soft-delete frees the unique key so the assignment can be recreated.
    const removed = await auth(
      request(app).delete(`${API}/teaching-assignments/${ctx.assignment.id}`)
    );
    assert.equal(removed.status, 200);
    const recreated = await auth(request(app).post(`${API}/teaching-assignments`)).send(body);
    assert.equal(recreated.status, 201);
  });

  it('enrolls a student, rejects duplicates and year mismatch, allows re-enroll after delete', async () => {
    const body = {
      studentId: ctx.student.id,
      classOfferingId: ctx.classOffering.id,
      academicYearId: ctx.year.id,
    };

    const created = await auth(request(app).post(`${API}/enrollments`)).send(body);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.enrollment.status, 'ACTIVE');
    assert.equal(
      created.body.data.enrollment.student.passwordHash,
      undefined
    );
    ctx.enrollment = created.body.data.enrollment;

    const stored = await prisma.enrollment.findUnique({ where: { id: ctx.enrollment.id } });
    assert.equal(stored.activeScopeKey, `${ctx.student.id}:${ctx.classOffering.id}`);

    const dup = await auth(request(app).post(`${API}/enrollments`)).send(body);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'ENROLLMENT_DUPLICATE');

    const mismatch = await auth(request(app).post(`${API}/enrollments`)).send({
      ...body,
      academicYearId: ctx.year2.id,
    });
    assert.equal(mismatch.status, 422);
    assert.equal(mismatch.body.code, 'VALIDATION_ERROR');

    const withdrawn = await auth(
      request(app).patch(`${API}/enrollments/${ctx.enrollment.id}/status`)
    ).send({ status: 'WITHDRAWN' });
    assert.equal(withdrawn.status, 200);
    assert.equal(withdrawn.body.data.enrollment.status, 'WITHDRAWN');
    assert.ok(withdrawn.body.data.enrollment.leftAt);

    const removed = await auth(request(app).delete(`${API}/enrollments/${ctx.enrollment.id}`));
    assert.equal(removed.status, 200);

    const deleted = await prisma.enrollment.findUnique({ where: { id: ctx.enrollment.id } });
    assert.equal(
      deleted.activeScopeKey,
      `${ctx.student.id}:${ctx.classOffering.id}:deleted:${ctx.enrollment.id}`
    );

    const again = await auth(request(app).post(`${API}/enrollments`)).send(body);
    assert.equal(again.status, 201);
    ctx.enrollment = again.body.data.enrollment;

    const list = await auth(request(app).get(`${API}/enrollments?studentId=${ctx.student.id}`));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.items.length, 1);
  });

  it('blocks deleting structures that are still in use', async () => {
    const classDelete = await auth(
      request(app).delete(`${API}/class-offerings/${ctx.classOffering.id}`)
    );
    assert.equal(classDelete.status, 409);
    assert.equal(classDelete.body.code, 'CLASS_OFFERING_HAS_DEPENDENTS');

    const gradeDelete = await auth(request(app).delete(`${API}/grade-levels/${ctx.grade.id}`));
    assert.equal(gradeDelete.status, 409);
  });

  it('keeps teacher and student actors separate (wrong-actor login)', async () => {
    const teacherLogin = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: teacherEmail, password: PASSWORD });
    assert.equal(teacherLogin.status, 200);

    const studentLogin = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ studentCode, password: PASSWORD });
    assert.equal(studentLogin.status, 200);

    // Teacher credentials do not work on student login and vice versa.
    const teacherAsStudent = await request(app)
      .post('/api/v1/student/auth/login')
      .send({ email: teacherEmail, password: PASSWORD });
    assert.equal(teacherAsStudent.status, 401);

    const studentAsTeacher = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: studentEmail, password: PASSWORD });
    assert.equal(studentAsTeacher.status, 401);

    // Neither identity can log in as an admin.
    const teacherAsAdmin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: teacherEmail, password: PASSWORD });
    assert.equal(teacherAsAdmin.status, 401);

    // Teacher / student tokens cannot call admin SMS routes.
    const teacherToken = teacherLogin.body.data.accessToken;
    const asTeacher = await request(app)
      .get(`${API}/enrollments`)
      .set('Authorization', `Bearer ${teacherToken}`);
    assert.equal(asTeacher.status, 401);

    const studentToken = studentLogin.body.data.accessToken;
    const asStudent = await request(app)
      .get(`${API}/teachers`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(asStudent.status, 401);

    // Admin token cannot be used on the teacher/student areas.
    const adminOnTeacher = await request(app)
      .get('/api/v1/teacher/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adminOnTeacher.status, 401);
    const adminOnStudent = await request(app)
      .get('/api/v1/student/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(adminOnStudent.status, 401);
  });

  it('deactivates, soft-deletes, and restores a teacher', async () => {
    const deactivate = await auth(
      request(app).patch(`${API}/teachers/${ctx.teacher.id}/deactivate`)
    );
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.body.data.teacher.isActive, false);

    const blocked = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({ email: teacherEmail, password: PASSWORD });
    assert.equal(blocked.status, 401);

    const activate = await auth(request(app).patch(`${API}/teachers/${ctx.teacher.id}/activate`));
    assert.equal(activate.status, 200);
    assert.equal(activate.body.data.teacher.isActive, true);

    const removed = await auth(request(app).delete(`${API}/teachers/${ctx.teacher.id}`));
    assert.equal(removed.status, 200);
    assert.ok(removed.body.data.teacher.deletedAt);

    const gone = await auth(request(app).get(`${API}/teachers/${ctx.teacher.id}`));
    assert.equal(gone.status, 404);

    const restored = await auth(request(app).patch(`${API}/teachers/${ctx.teacher.id}/restore`));
    assert.equal(restored.status, 200);
    assert.equal(restored.body.data.teacher.deletedAt, null);
  });
});
