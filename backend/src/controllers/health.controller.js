const {
  checkDatabaseConnection,
  isDatabaseConnected,
} = require('../config/database');
const { sendSuccess, sendError } = require('../utils/apiResponse');

async function getHealth(req, res) {
  let database = 'disconnected';

  try {
    await checkDatabaseConnection();
    database = 'connected';
  } catch (_error) {
    database = 'disconnected';
  }

  const databaseOk = database === 'connected';
  const payload = {
    status: databaseOk ? 'ok' : 'degraded',
    api: 'up',
    database,
    databaseVerified: isDatabaseConnected(),
    timestamp: new Date().toISOString(),
  };

  if (!databaseOk) {
    return sendError(res, {
      status: 503,
      message: 'API is running but database is unavailable',
      code: 'DATABASE_UNAVAILABLE',
      data: payload,
    });
  }

  return sendSuccess(res, {
    status: 200,
    message: 'API is running and database is connected',
    data: payload,
  });
}

module.exports = {
  getHealth,
};
