/**
 * Phase 14 admin API contract checks against the live backend.
 * Credentials are read from backend .env and never printed.
 *
 * Usage: node scripts/qa-admin-api.mjs
 * Optional: API_BASE_URL=http://localhost:5000/api/v1
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import axios from 'axios';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend');
const require = createRequire(path.join(backendRoot, 'package.json'));
require('dotenv').config({ path: path.join(backendRoot, '.env'), quiet: true });

const baseURL = (process.env.API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('BLOCKED: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not available for QA login.');
  process.exit(2);
}

const client = axios.create({
  baseURL,
  timeout: 20_000,
  validateStatus: () => true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

async function check(name, fn) {
  process.stdout.write(`• ${name} … `);
  await fn();
  console.log('ok');
}

async function main() {
  console.log(`Admin API QA against ${baseURL}\n`);
  let token;

  await check('invalid credentials → 401', async () => {
    const res = await client.post('/admin/auth/login', {
      email: 'qa-invalid@example.com',
      password: 'DefinitelyWrong1',
    });
    assert(res.status === 401, `status ${res.status}`, res.data);
    assert(res.data?.success === false, 'success false');
  });

  await check('valid super-admin login', async () => {
    const res = await client.post('/admin/auth/login', { email, password });
    assert(res.status === 200, `status ${res.status}`, res.data);
    token = res.data?.data?.accessToken;
    assert(typeof token === 'string' && token.length > 20, 'accessToken missing');
    client.defaults.headers.Authorization = `Bearer ${token}`;
  });

  await check('me returns admin profile', async () => {
    const res = await client.get('/admin/auth/me');
    assert(res.status === 200, `status ${res.status}`, res.data);
    assert(res.data?.data?.admin || res.data?.data?.email, 'admin profile missing', res.data);
  });

  await check('dashboard overview authorized', async () => {
    const res = await client.get('/admin/dashboard/overview');
    assert(res.status === 200, `status ${res.status}`, res.data);
    assert(res.data?.success === true, 'success');
  });

  await check('CMS list endpoints authorized', async () => {
    for (const pathName of [
      '/admin/pages',
      '/admin/blog/posts',
      '/admin/blog/categories',
      '/admin/events',
      '/admin/media',
    ]) {
      const res = await client.get(pathName);
      assert(res.status === 200, `${pathName} → ${res.status}`, res.data);
    }
  });

  await check('malformed bearer token → 401', async () => {
    const res = await client.get('/admin/pages', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert(res.status === 401, `status ${res.status}`, res.data);
  });

  await check('missing bearer on admin pages → 401', async () => {
    const res = await axios.get(`${baseURL}/admin/pages`, {
      validateStatus: () => true,
      headers: { Accept: 'application/json' },
    });
    assert(res.status === 401, `status ${res.status}`, res.data);
  });

  await check('logout succeeds', async () => {
    client.defaults.headers.Authorization = `Bearer ${token}`;
    const res = await client.post('/admin/auth/logout');
    assert(res.status === 200, `status ${res.status}`, res.data);
  });

  console.log('\nAdmin API QA checks passed.');
}

main().catch((error) => {
  console.error('\nAdmin API QA failed:', error.message || error);
  if (error.detail) {
    const safe = JSON.stringify(error.detail, null, 2).slice(0, 600);
    console.error(safe);
  }
  process.exit(1);
});
