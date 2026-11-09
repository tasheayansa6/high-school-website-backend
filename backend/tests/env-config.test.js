/**
 * Production environment validation (spawned processes — avoids shared module cache).
 * Never asserts on secret values themselves.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const backendRoot = path.join(__dirname, '..');

function runAssert(extraEnv = {}) {
  const script = `
    try {
      const env = require('./src/config/env');
      env.assertProductionConfig();
      console.log('ASSERT_OK');
      process.exit(0);
    } catch (error) {
      console.log('ASSERT_FAIL:' + (error.message || 'unknown'));
      process.exit(2);
    }
  `;

  return spawnSync(process.execPath, ['-e', script], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      // Neutralize dotenv leftovers for deterministic tests
      DATABASE_URL: 'mysql://user:pass@127.0.0.1:3306/db',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: '3306',
      DATABASE_USER: 'user',
      DATABASE_PASSWORD: 'pass',
      DATABASE_NAME: 'db',
      JWT_SECRET: 'unit-test-production-jwt-secret-value-32c',
      CORS_ORIGIN: 'https://app.example.com',
      EMAIL_TRANSPORT: 'json',
      STORAGE_PROVIDER: 'local',
      TRUST_PROXY: '1',
      ...extraEnv,
    },
  });
}

describe('Production environment validation', () => {
  it('accepts a complete production configuration', () => {
    const result = runAssert();
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /ASSERT_OK/);
  });

  it('rejects missing JWT_SECRET', () => {
    const result = runAssert({ JWT_SECRET: '' });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /JWT_SECRET must be set/);
  });

  it('rejects short JWT_SECRET', () => {
    const result = runAssert({ JWT_SECRET: 'too-short-secret-value' });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /at least 32 characters/);
  });

  it('rejects documented placeholder JWT_SECRET', () => {
    const result = runAssert({
      JWT_SECRET: 'replace-with-a-long-random-secret-32c',
    });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /placeholder/i);
  });

  it('rejects wildcard CORS_ORIGIN', () => {
    const result = runAssert({ CORS_ORIGIN: '*' });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /CORS_ORIGIN/);
  });

  it('rejects incomplete SMTP configuration', () => {
    const result = runAssert({
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: '',
      SMTP_PASS: '',
    });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /SMTP_USER/);
  });

  it('rejects s3 provider without credentials (names only)', () => {
    const result = runAssert({
      STORAGE_PROVIDER: 's3',
      S3_BUCKET: '',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
    });
    assert.equal(result.status, 2);
    assert.match(result.stdout, /STORAGE_PROVIDER=s3 requires/);
    assert.doesNotMatch(result.stdout, /AKIA[0-9A-Z]{16}/);
  });

  it('does not print secret material in failure output', () => {
    const sentinel = 'super-secret-should-never-appear-in-logs-xyz';
    const result = runAssert({
      JWT_SECRET: '',
      DATABASE_PASSWORD: sentinel,
      SMTP_PASS: sentinel,
      S3_SECRET_ACCESS_KEY: sentinel,
    });
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sentinel));
  });
});
