const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  quiet: true,
});

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = Number(process.env.PORT) || 5000;

const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction) {
  if (corsOrigin.length === 0 || corsOrigin.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must be an explicit comma-separated allowlist in production. Wildcard (*) is not allowed.'
    );
  }
}

const database = {
  url: process.env.DATABASE_URL || '',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 3306,
  user: process.env.DATABASE_USER || '',
  password: process.env.DATABASE_PASSWORD || '',
  name: process.env.DATABASE_NAME || '',
};

const bodyLimit = process.env.BODY_LIMIT || '100kb';

const rateLimit = {
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || (isProduction ? 200 : 1000),
};

function getMissingDatabaseVariables() {
  const required = {
    DATABASE_URL: database.url,
    DATABASE_HOST: database.host,
    DATABASE_PORT: String(process.env.DATABASE_PORT || database.port),
    DATABASE_USER: database.user,
    DATABASE_PASSWORD: database.password,
    DATABASE_NAME: database.name,
  };

  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function assertDatabaseConfig() {
  const missing = getMissingDatabaseVariables();

  if (missing.length > 0) {
    const error = new Error(
      `Missing required database environment variables: ${missing.join(', ')}`
    );
    error.code = 'DATABASE_CONFIG_INVALID';
    error.status = 500;
    throw error;
  }
}

function getCorsOptions() {
  return {
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) may omit Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (corsOrigin.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

const env = {
  nodeEnv,
  port,
  corsOrigin,
  bodyLimit,
  rateLimit,
  database,
  isProduction,
  assertDatabaseConfig,
  getMissingDatabaseVariables,
  getCorsOptions,
};

module.exports = env;
