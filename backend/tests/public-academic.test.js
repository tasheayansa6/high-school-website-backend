const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');

const STAMP = Date.now().toString(36).toUpperCase();
const YEAR_CODE = `AA${STAMP}-Y`;
const G9_CODE = `AA${STAMP}-G9`;
const G10_CODE = `AA${STAMP}-G10`;
const MATH_CODE = `AA${STAMP}-MATH`;
const DEL_CODE = `AA${STAMP}-DEL`;
const E2E_GRADE_CODE = `E${STAMP}-G`;
const E2E_SUBJECT_CODE = `E${STAMP}-M`;

const OWNED_CODES = [
  YEAR_CODE,
  G9_CODE,
  G10_CODE,
  MATH_CODE,
  DEL_CODE,
  E2E_GRADE_CODE,
  E2E_SUBJECT_CODE,
];

async function cleanup() {
  // Soft-delete only — owned rows may gain FKs from parallel suites; hard delete is unsafe.
  const now = new Date();
  await prisma.subject.updateMany({
    where: { code: { in: OWNED_CODES } },
    data: { deletedAt: now },
  });
  await prisma.gradeLevel.updateMany({
    where: { code: { in: OWNED_CODES } },
    data: { deletedAt: now },
  });
  await prisma.academicYear.updateMany({
    where: { code: { in: OWNED_CODES } },
    data: { deletedAt: now, isCurrent: false },
  });
}

describe('Public academic overview', () => {
  before(async () => {
    await connectDatabase();
    await cleanup();

    // Other SMS suites may leave a different year marked current; isolate this assertion.
    await prisma.academicYear.updateMany({ data: { isCurrent: false } });

    await prisma.academicYear.create({
      data: {
        name: '2026/27 Academic Year',
        code: YEAR_CODE,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2027-06-30'),
        isCurrent: true,
      },
    });

    await prisma.gradeLevel.createMany({
      data: [
        { name: 'Grade 9', code: G9_CODE, sortOrder: 9 },
        { name: 'Grade 10', code: G10_CODE, sortOrder: 10 },
        {
          name: `E2E Grade ${STAMP}`,
          code: E2E_GRADE_CODE,
          sortOrder: 99,
        },
      ],
    });

    await prisma.subject.create({
      data: {
        name: 'Mathematics',
        code: MATH_CODE,
        description: 'Secondary mathematics',
      },
    });

    await prisma.subject.create({
      data: {
        name: `E2E Maths ${STAMP}`,
        code: E2E_SUBJECT_CODE,
        description: 'Should never appear publicly',
      },
    });

    await prisma.subject.create({
      data: {
        name: 'Deleted Subject',
        code: DEL_CODE,
        description: 'Should not appear',
        deletedAt: new Date(),
      },
    });
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('returns active real catalog rows and hides E2E / soft-deleted junk', async () => {
    const res = await request(app).get('/api/v1/academic/overview').expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.counts.subjects >= 1);
    assert.ok(res.body.data.counts.gradeLevels >= 2);

    const subjectCodes = res.body.data.subjects.map((s) => s.code);
    assert.ok(subjectCodes.includes(MATH_CODE));
    assert.equal(subjectCodes.includes(DEL_CODE), false);
    assert.equal(subjectCodes.includes(E2E_SUBJECT_CODE), false);

    const gradeCodes = res.body.data.gradeLevels.map((g) => g.code);
    assert.ok(gradeCodes.includes(G9_CODE));
    assert.ok(gradeCodes.includes(G10_CODE));
    assert.equal(gradeCodes.includes(E2E_GRADE_CODE), false);

    const gradeNames = res.body.data.gradeLevels.map((g) => g.name);
    assert.equal(
      gradeNames.some((n) => /^E2E\b/i.test(n)),
      false
    );

    assert.equal(res.body.data.currentAcademicYear?.code, YEAR_CODE);

    const sample = JSON.stringify(res.body.data);
    assert.equal(sample.includes('password'), false);
    assert.equal(sample.includes('email'), false);
  });
});
