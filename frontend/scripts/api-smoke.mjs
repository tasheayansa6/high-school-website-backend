/**
 * Live API smoke test against the running backend (no mocks).
 * Usage: node scripts/api-smoke.mjs
 * Optional: API_BASE_URL=http://localhost:5000/api/v1 node scripts/api-smoke.mjs
 */
import axios from 'axios';

const baseURL = (process.env.API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const client = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  validateStatus: () => true,
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function check(name, fn) {
  process.stdout.write(`• ${name} … `);
  await fn();
  console.log('ok');
}

async function main() {
  console.log(`API smoke against ${baseURL}\n`);

  await check('GET /health → 200 success envelope', async () => {
    const res = await client.get('/health');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.data?.success === true, 'success !== true');
    assert(res.data?.data?.database === 'connected', 'database not connected');
  });

  await check('GET /blog/posts → 200 paginated items', async () => {
    const res = await client.get('/blog/posts', { params: { page: 1, limit: 5 } });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.items), 'items missing');
    assert(res.data?.data?.pagination, 'pagination missing');
  });

  await check('GET /blog/categories → 200', async () => {
    const res = await client.get('/blog/categories');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.categories), 'categories missing');
  });

  await check('GET /pages → 200', async () => {
    const res = await client.get('/pages');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.items), 'items missing');
  });

  await check('GET /events → 200', async () => {
    const res = await client.get('/events');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.data?.data?.items), 'items missing');
  });

  await check('GET /settings/public → 200', async () => {
    const res = await client.get('/settings/public');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(
      res.data?.data?.settings && typeof res.data.data.settings === 'object',
      'settings missing',
    );
  });

  await check('GET /blog/posts/missing-slug → 404 envelope', async () => {
    const res = await client.get('/blog/posts/definitely-not-a-real-slug-xyz');
    assert(res.status === 404, `expected 404, got ${res.status}`);
    assert(res.data?.success === false, 'success should be false');
    assert(typeof res.data?.message === 'string', 'message missing');
  });

  await check('POST /contact empty body → 422 validation', async () => {
    const res = await client.post('/contact', {});
    assert(res.status === 422, `expected 422, got ${res.status}`);
    assert(res.data?.success === false, 'success should be false');
    assert(res.data?.code === 'VALIDATION_ERROR', `code=${res.data?.code}`);
    assert(Array.isArray(res.data?.errors), 'errors missing');
  });

  await check('CORS preflight Origin http://localhost:5173', async () => {
    const res = await client.request({
      url: '/health',
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert(res.status === 204 || res.status === 200, `unexpected OPTIONS status ${res.status}`);
    const allowOrigin = res.headers['access-control-allow-origin'];
    assert(allowOrigin === 'http://localhost:5173', `CORS allow-origin=${allowOrigin}`);
  });

  await check('Invalid base URL handling (network failure)', async () => {
    const bad = axios.create({
      baseURL: 'http://127.0.0.1:1/api/v1',
      timeout: 1500,
    });
    let failed = false;
    try {
      await bad.get('/health');
    } catch (error) {
      failed = true;
      assert(!error.response, 'expected network-level failure');
    }
    assert(failed, 'request to closed port should fail');
  });

  console.log('\nAll smoke checks passed.');
}

main().catch((error) => {
  console.error('\nSmoke failed:', error.message || error);
  process.exit(1);
});
