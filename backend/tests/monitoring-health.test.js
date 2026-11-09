/**
 * Health endpoints, correlation IDs, and log redaction.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const { redactUrl, redactHeaders } = require('../src/utils/redact');
const monitoring = require('../src/services/monitoring.service');

describe('Monitoring and health endpoints', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await disconnectDatabase();
  });

  it('liveness returns 200 without requiring dependency details', async () => {
    const res = await request(app).get('/api/v1/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.check, 'liveness');
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.database, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.data, 'storagePath'), false);
  });

  it('readiness returns 200 when database is available', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.check, 'readiness');
    assert.equal(res.body.data.database, 'connected');
    assert.ok(res.body.data.storage);
    assert.ok(['local', 's3'].includes(res.body.data.storage.provider));
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.data, 'DATABASE_URL'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.data.storage, 'path'), false);
  });

  it('legacy /health aliases readiness', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.database, 'connected');
  });

  it('assigns and echoes X-Request-Id correlation header', async () => {
    const res = await request(app)
      .get('/api/v1/health/live')
      .set('X-Request-Id', 'test-correlation-id-001');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], 'test-correlation-id-001');
  });

  it('generates a request id when client does not send one', async () => {
    const res = await request(app).get('/api/v1/health/live');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id']);
    assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/i);
  });

  it('redacts sensitive query parameters and headers', () => {
    assert.match(
      redactUrl('/api/v1/newsletter/confirm?token=super-secret-value&x=1'),
      /token=\[REDACTED\]/
    );
    assert.doesNotMatch(
      redactUrl('/api/v1/newsletter/confirm?token=super-secret-value'),
      /super-secret-value/
    );

    const headers = redactHeaders({
      authorization: 'Bearer abc.def.ghi',
      cookie: 'session=1',
      'content-type': 'application/json',
    });
    assert.equal(headers.authorization, '[REDACTED]');
    assert.equal(headers.cookie, '[REDACTED]');
    assert.equal(headers['content-type'], 'application/json');
  });

  it('monitoring captureException does not throw when disabled', () => {
    monitoring.resetMonitoringForTests();
    assert.equal(monitoring.isEnabled(), false);
    assert.doesNotThrow(() => {
      monitoring.captureException(new Error('boom'), { requestId: 'x' });
    });
  });

  it('monitoring init failure is swallowed', () => {
    monitoring.resetMonitoringForTests();
    const previous = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
    // Force require path to succeed or fail safely — capture must not throw.
    assert.doesNotThrow(() => {
      monitoring.initMonitoring();
      monitoring.captureException(new Error('monitored'));
    });
    if (previous === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = previous;
    }
    monitoring.resetMonitoringForTests();
  });
});
