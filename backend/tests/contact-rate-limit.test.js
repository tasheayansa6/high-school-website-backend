const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CONTACT_RATE_LIMIT_MAX = '2';
process.env.CONTACT_RATE_LIMIT_WINDOW_MS = '60000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');

const createdIds = [];

describe('Phase 8 contact rate limiting', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    if (createdIds.length) {
      await prisma.contactMessage.deleteMany({ where: { id: { in: createdIds } } });
    }
    await disconnectDatabase();
  });

  it('returns 429 after exceeding the contact submission limit', async () => {
    for (let i = 0; i < 2; i += 1) {
      const res = await request(app).post('/api/v1/contact').send({
        name: `Rate Parent ${i}`,
        email: `phase8.rate${i}@example.com`,
        subject: 'Rate limit probe',
        message: 'This is a rate limit probe message.',
      });
      assert.equal(res.status, 201);
      createdIds.push(res.body.data.submission.id);
    }

    const blocked = await request(app).post('/api/v1/contact').send({
      name: 'Rate Parent Blocked',
      email: 'phase8.rate.blocked@example.com',
      subject: 'Rate limit probe',
      message: 'This submission should be blocked.',
    });

    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, 'CONTACT_RATE_LIMIT_EXCEEDED');
  });
});
