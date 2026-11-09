/**
 * Learning materials: upload, publish, isolation, file security.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';
process.env.LEARNING_MATERIAL_MAX_FILE_SIZE_BYTES = String(64 * 1024);
process.env.MEDIA_STORAGE_PATH = path.join(process.cwd(), 'storage', 'test-learning-materials');

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const storageService = require('../src/services/storage.service');

const PASSWORD = 'LearnMat99!';
const PREFIX = 'sms.lmat';
const CODE = 'LMAT';
const ADMIN = `${PREFIX}.admin@example.com`;
const API = '/api/v1/admin/sms';

const PDF_BUFFER = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const TXT_BUFFER = Buffer.from('this is not an allowed learning material type');

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

  const materials = await prisma.learningMaterial.findMany({
    where: {
      OR: [
        { teacherId: { in: teacherIds } },
        { classOfferingId: { in: classIds } },
        { academicYearId: { in: yearIds } },
      ],
    },
  });
  for (const material of materials) {
    await storageService.deleteObject(material.storagePath).catch(() => {});
  }
  if (materials.length) {
    await prisma.learningMaterial.deleteMany({
      where: { id: { in: materials.map((m) => m.id) } },
    });
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
  await prisma.admin.deleteMany({ where: { email: ADMIN } });
}

describe('Learning materials module', () => {
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
    await storageService.ensureStorageReady();
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
        firstName: 'LM',
        lastName: 'Admin',
        roleId: superRole.id,
      },
    });

    const login = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN, password: PASSWORD });
    assert.equal(login.status, 200);
    adminToken = login.body.data.accessToken;

    const post = async (pathSuffix, body) => {
      const res = await admin(request(app).post(`${API}${pathSuffix}`)).send(body);
      assert.equal(res.status, 201, JSON.stringify(res.body));
      return res.body.data;
    };

    ctx.year = (
      await post('/academic-years', {
        name: 'LM Year',
        code: `${CODE}-Y`,
        startsOn: '2037-09-01',
        endsOn: '2038-06-30',
      })
    ).academicYear;
    ctx.grade = (
      await post('/grade-levels', { name: 'LM Grade', code: `${CODE}-G`, sortOrder: 1 })
    ).gradeLevel;
    ctx.section = (await post('/sections', { name: 'A', code: `${CODE}-S` })).section;
    ctx.subject = (
      await post('/subjects', { name: 'LM Maths', code: `${CODE}-M` })
    ).subject;
    ctx.teacher = (
      await post('/teachers', {
        email: `${PREFIX}.teacher@example.com`,
        password: PASSWORD,
        firstName: 'LM',
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
    ctx.section2 = (await post('/sections', { name: 'B', code: `${CODE}-S2` })).section;
    ctx.klass2 = (
      await post('/class-offerings', {
        academicYearId: ctx.year.id,
        gradeLevelId: ctx.grade.id,
        sectionId: ctx.section2.id,
      })
    ).classOffering;

    await post('/teaching-assignments', {
      teacherId: ctx.teacher.id,
      classOfferingId: ctx.klass.id,
      subjectId: ctx.subject.id,
    });
    await post('/teaching-assignments', {
      teacherId: ctx.otherTeacher.id,
      classOfferingId: ctx.klass2.id,
      subjectId: ctx.subject.id,
    });

    ctx.student = (
      await post('/students', {
        email: `${PREFIX}.student@example.com`,
        password: PASSWORD,
        firstName: 'LM',
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

    teacherToken = (
      await request(app)
        .post('/api/v1/teacher/auth/login')
        .send({ email: `${PREFIX}.teacher@example.com`, password: PASSWORD })
    ).body.data.accessToken;
    otherTeacherToken = (
      await request(app)
        .post('/api/v1/teacher/auth/login')
        .send({ email: `${PREFIX}.other@example.com`, password: PASSWORD })
    ).body.data.accessToken;
    studentToken = (
      await request(app)
        .post('/api/v1/student/auth/login')
        .send({ email: `${PREFIX}.student@example.com`, password: PASSWORD })
    ).body.data.accessToken;
    otherStudentToken = (
      await request(app)
        .post('/api/v1/student/auth/login')
        .send({ email: `${PREFIX}.student2@example.com`, password: PASSWORD })
    ).body.data.accessToken;
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('teacher uploads a PDF learning material; metadata persists', async () => {
    const res = await teacher(request(app).post('/api/v1/teacher/learning-materials'))
      .field('title', 'Algebra Notes')
      .field('description', 'Chapter 1')
      .field('category', 'NOTES')
      .field('academicYearId', String(ctx.year.id))
      .field('classOfferingId', String(ctx.klass.id))
      .field('subjectId', String(ctx.subject.id))
      .field('publish', 'false')
      .attach('file', PDF_BUFFER, 'algebra-notes.pdf');

    assert.equal(res.status, 201, JSON.stringify(res.body));
    ctx.materialId = res.body.data.material.id;
    assert.equal(res.body.data.material.mimeType, 'application/pdf');
    assert.equal(res.body.data.material.isPublished, false);
    assert.equal(res.body.data.material.storagePath, undefined);

    const row = await prisma.learningMaterial.findUnique({ where: { id: ctx.materialId } });
    assert.ok(row.storagePath);
    assert.equal(await storageService.objectExists(row.storagePath), true);
  });

  it('rejects invalid file type', async () => {
    const res = await teacher(request(app).post('/api/v1/teacher/learning-materials'))
      .field('title', 'Bad file')
      .field('academicYearId', String(ctx.year.id))
      .field('classOfferingId', String(ctx.klass.id))
      .field('subjectId', String(ctx.subject.id))
      .attach('file', TXT_BUFFER, 'notes.txt');
    assert.equal(res.status, 415);
    assert.equal(res.body.code, 'UNSUPPORTED_FILE_TYPE');
  });

  it('rejects oversized file', async () => {
    const big = Buffer.concat([PDF_BUFFER, Buffer.alloc(70 * 1024, 0x20)]);
    const res = await teacher(request(app).post('/api/v1/teacher/learning-materials'))
      .field('title', 'Too big')
      .field('academicYearId', String(ctx.year.id))
      .field('classOfferingId', String(ctx.klass.id))
      .field('subjectId', String(ctx.subject.id))
      .attach('file', big, 'big.pdf');
    assert.equal(res.status, 413);
    assert.equal(res.body.code, 'FILE_TOO_LARGE');
  });

  it('rejects upload for unassigned class', async () => {
    const res = await teacher(request(app).post('/api/v1/teacher/learning-materials'))
      .field('title', 'Wrong class')
      .field('academicYearId', String(ctx.year.id))
      .field('classOfferingId', String(ctx.klass2.id))
      .field('subjectId', String(ctx.subject.id))
      .attach('file', PDF_BUFFER, 'wrong.pdf');
    assert.equal(res.status, 422);
  });

  it('teacher edits metadata', async () => {
    const res = await teacher(
      request(app).patch(`/api/v1/teacher/learning-materials/${ctx.materialId}`)
    ).send({ title: 'Algebra Notes (updated)', description: 'Updated chapter' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.material.title, 'Algebra Notes (updated)');
  });

  it('other teacher cannot modify or download', async () => {
    const patch = await request(app)
      .patch(`/api/v1/teacher/learning-materials/${ctx.materialId}`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ title: 'Hijack' });
    assert.equal(patch.status, 403);

    const dl = await request(app)
      .get(`/api/v1/teacher/learning-materials/${ctx.materialId}/download`)
      .set('Authorization', `Bearer ${otherTeacherToken}`);
    assert.equal(dl.status, 403);
  });

  it('unpublished material hidden from student; publish reveals it', async () => {
    const hidden = await student(request(app).get('/api/v1/student/learning-materials'));
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.data.items.length, 0);

    const pub = await teacher(
      request(app).post(`/api/v1/teacher/learning-materials/${ctx.materialId}/publish`)
    );
    assert.equal(pub.status, 200);
    assert.equal(pub.body.data.material.isPublished, true);

    const visible = await student(request(app).get('/api/v1/student/learning-materials'));
    assert.equal(visible.status, 200);
    assert.ok(visible.body.data.items.some((item) => item.id === ctx.materialId));
  });

  it('enrolled student can download; other student cannot', async () => {
    const ok = await student(
      request(app).get(`/api/v1/student/learning-materials/${ctx.materialId}/download`)
    );
    assert.equal(ok.status, 200);
    assert.match(ok.headers['content-type'], /pdf/);

    const denied = await request(app)
      .get(`/api/v1/student/learning-materials/${ctx.materialId}/download`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(denied.status, 403);

    const unauth = await request(app).get(
      `/api/v1/student/learning-materials/${ctx.materialId}/download`
    );
    assert.equal(unauth.status, 401);
  });

  it('admin lists, unpublishes, archives; student loses access', async () => {
    const list = await admin(request(app).get(`${API}/learning-materials`));
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((item) => item.id === ctx.materialId));

    const stats = await admin(request(app).get(`${API}/learning-materials/stats`));
    assert.equal(stats.status, 200);
    assert.ok(stats.body.data.total >= 1);

    const un = await admin(
      request(app).post(`${API}/learning-materials/${ctx.materialId}/unpublish`)
    );
    assert.equal(un.status, 200);

    const hidden = await student(request(app).get('/api/v1/student/learning-materials'));
    assert.ok(!hidden.body.data.items.some((item) => item.id === ctx.materialId));

    await admin(request(app).post(`${API}/learning-materials/${ctx.materialId}/publish`));
    const archived = await admin(
      request(app).post(`${API}/learning-materials/${ctx.materialId}/archive`)
    );
    assert.equal(archived.status, 200);
    assert.ok(archived.body.data.material.archivedAt);

    const afterArchive = await student(request(app).get('/api/v1/student/learning-materials'));
    assert.ok(!afterArchive.body.data.items.some((item) => item.id === ctx.materialId));
  });

  it('teacher can delete own material', async () => {
    const create = await teacher(request(app).post('/api/v1/teacher/learning-materials'))
      .field('title', 'Temp')
      .field('academicYearId', String(ctx.year.id))
      .field('classOfferingId', String(ctx.klass.id))
      .field('subjectId', String(ctx.subject.id))
      .attach('file', PDF_BUFFER, 'temp.pdf');
    assert.equal(create.status, 201);
    const id = create.body.data.material.id;

    const del = await teacher(request(app).delete(`/api/v1/teacher/learning-materials/${id}`));
    assert.equal(del.status, 200);
    const row = await prisma.learningMaterial.findUnique({ where: { id } });
    assert.ok(row.deletedAt);
  });
});
