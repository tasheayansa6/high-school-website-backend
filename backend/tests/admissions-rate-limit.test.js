const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ADMISSIONS_RATE_LIMIT_MAX = '2';
process.env.ADMISSIONS_RATE_LIMIT_WINDOW_MS = '60000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');

const createdIds = [];

describe('Phase 10 admissions rate limiting', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    if (createdIds.length) {
      await prisma.admissionInquiry.deleteMany({ where: { id: { in: createdIds } } });
    }
    await disconnectDatabase();
  });

  it('returns 429 after exceeding the admissions submission limit', async () => {
    for (let i = 0; i < 2; i += 1) {
      const res = await request(app).post('/api/v1/admissions/inquiries').send({
        studentName: `Rate Student ${i}`,
        email: `phase10.rate${i}@example.com`,
        phone: `+25191100020${i}`,
        gradeApplyingFor: 'Grade 9',
        academicYear: '2026/2027',
        message: 'This is a rate limit probe inquiry.',
      });
      assert.equal(res.status, 201, res.body.message);
      createdIds.push(res.body.data.submission.id);
    }

    const blocked = await request(app).post('/api/v1/admissions/inquiries').send({
      studentName: 'Rate Student Blocked',
      email: 'phase10.rate.blocked@example.com',
      phone: '+251911000299',
      gradeApplyingFor: 'Grade 9',
      academicYear: '2026/2027',
      message: 'This inquiry should be blocked by rate limiting.',
    });

    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, 'ADMISSIONS_RATE_LIMIT_EXCEEDED');
  });
});
