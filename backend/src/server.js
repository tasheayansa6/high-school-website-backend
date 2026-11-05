const env = require('./config/env');
const {
  connectDatabase,
  disconnectDatabase,
} = require('./config/database');

async function start() {
  try {
    if (env.isProduction) {
      env.assertProductionConfig();
    }

    await connectDatabase();
    console.log(
      `MySQL connected (${env.database.host}:${env.database.port}/${env.database.name})`
    );
  } catch (error) {
    console.error(error.message);

    if (env.isProduction) {
      console.error('Production startup aborted due to configuration or database failure.');
      process.exit(1);
    }

    console.error(
      'API will start, but database-dependent features will be unavailable until MySQL is reachable.'
    );
  }

  // Load the Express app only after production config checks so misconfiguration
  // fails before routes are mounted and traffic is accepted.
  const app = require('./app');

  const server = app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
  });

  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await disconnectDatabase();
      } catch (error) {
        console.error('Error while disconnecting from MySQL:', {
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
