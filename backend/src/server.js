const env = require('./config/env');
const logger = require('./utils/logger');
const monitoring = require('./services/monitoring.service');
const {
  connectDatabase,
  disconnectDatabase,
} = require('./config/database');

async function start() {
  monitoring.initMonitoring();

  try {
    if (env.isProduction) {
      env.assertProductionConfig();
    }

    await connectDatabase();
    logger.info({
      type: 'startup',
      event: 'database_connected',
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
    });
  } catch (error) {
    logger.error({
      type: 'startup',
      event: 'database_connection_failed',
      message: error.message,
      code: error.code || null,
    });

    if (env.isProduction) {
      logger.error({
        type: 'startup',
        event: 'aborted',
        message: 'Production startup aborted due to configuration or database failure.',
      });
      process.exit(1);
    }

    logger.warn({
      type: 'startup',
      event: 'continuing_without_database',
      message:
        'API will start, but database-dependent features will be unavailable until MySQL is reachable.',
    });
  }

  // Load the Express app only after production config checks so misconfiguration
  // fails before routes are mounted and traffic is accepted.
  const app = require('./app');

  const server = app.listen(env.port, () => {
    logger.info({
      type: 'startup',
      event: 'listening',
      port: env.port,
      nodeEnv: env.nodeEnv,
    });
  });

  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ type: 'shutdown', event: 'signal', signal });

    server.close(async () => {
      try {
        await monitoring.flush(2000);
        await disconnectDatabase();
      } catch (error) {
        logger.error({
          type: 'shutdown',
          event: 'disconnect_failed',
          code: error.code || null,
          name: error.name || null,
        });
      } finally {
        process.exit(0);
      }
    });
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

start();
