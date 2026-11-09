const fs = require('fs/promises');
const env = require('../config/env');
const {
  checkDatabaseConnection,
  isDatabaseConnected,
} = require('../config/database');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Liveness: process is up. No dependency checks.
 */
async function getLiveness(req, res) {
  return sendSuccess(res, {
    status: 200,
    message: 'API process is alive',
    data: {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    },
  });
}

async function checkStorageReadiness() {
  if (env.storage.provider === 's3') {
    try {
      env.assertStorageConfig();
      return { status: 'configured', provider: 's3' };
    } catch (_error) {
      return { status: 'misconfigured', provider: 's3' };
    }
  }

  try {
    const root = env.storage.local.storagePath;
    await fs.access(root);
    return { status: 'ready', provider: 'local' };
  } catch (_error) {
    try {
      await fs.mkdir(env.storage.local.storagePath, { recursive: true });
      return { status: 'ready', provider: 'local' };
    } catch (_mkdirError) {
      return { status: 'unavailable', provider: 'local' };
    }
  }
}

/**
 * Readiness: required dependencies available for traffic.
 * Avoids expensive queries and never returns secrets or absolute paths.
 */
async function getReadiness(req, res) {
  let database = 'disconnected';

  try {
    await checkDatabaseConnection();
    database = 'connected';
  } catch (_error) {
    database = 'disconnected';
  }

  const storage = await checkStorageReadiness();
  const databaseOk = database === 'connected';
  const storageOk = storage.status === 'ready' || storage.status === 'configured';
  const ready = databaseOk && storageOk;

  const payload = {
    status: ready ? 'ok' : 'unavailable',
    check: 'readiness',
    api: 'up',
    database,
    databaseVerified: isDatabaseConnected(),
    storage: {
      provider: storage.provider,
      status: storage.status,
    },
    timestamp: new Date().toISOString(),
  };

  if (!ready) {
    return sendError(res, {
      status: 503,
      message: 'API is not ready to accept traffic',
      code: 'SERVICE_UNAVAILABLE',
      data: payload,
    });
  }

  return sendSuccess(res, {
    status: 200,
    message: 'API is ready',
    data: payload,
  });
}

/** Backward-compatible alias used by Railway healthcheckPath. */
async function getHealth(req, res) {
  return getReadiness(req, res);
}

module.exports = {
  getHealth,
  getLiveness,
  getReadiness,
};
