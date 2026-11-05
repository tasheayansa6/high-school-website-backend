const path = require('path');
const crypto = require('crypto');
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

const loginRateLimit = {
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
};

const contactRateLimit = {
  windowMs: Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.CONTACT_RATE_LIMIT_MAX) || 5,
};

const newsletterRateLimit = {
  windowMs: Number(process.env.NEWSLETTER_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.NEWSLETTER_RATE_LIMIT_MAX) || 5,
};

const admissionsRateLimit = {
  windowMs: Number(process.env.ADMISSIONS_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.ADMISSIONS_RATE_LIMIT_MAX) || 5,
};

const mediaRateLimit = {
  windowMs: Number(process.env.MEDIA_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.MEDIA_RATE_LIMIT_MAX) || 30,
};

const media = {
  storagePath: path.resolve(
    process.env.MEDIA_STORAGE_PATH || path.join(process.cwd(), 'storage', 'uploads')
  ),
  maxFileSizeBytes: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES) || 5 * 1024 * 1024,
  publicBaseUrl: (
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.API_PUBLIC_URL ||
    `http://localhost:${port}/api/v1`
  ).replace(/\/$/, ''),
};

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return crypto.createHash('sha256').update('dev-only-jwt-secret').digest('hex');
}

const jwt = {
  secret: resolveJwtSecret(),
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  issuer: process.env.JWT_ISSUER || 'high-school-website-backend',
  audience: process.env.JWT_AUDIENCE || 'high-school-admin',
};

const emailTransport = (process.env.EMAIL_TRANSPORT || (isProduction ? 'smtp' : 'json')).toLowerCase();

const email = {
  transport: emailTransport,
  from: process.env.SMTP_FROM || 'School Newsletter <noreply@localhost>',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const newsletter = {
  confirmationTokenTtlHours: Number(process.env.NEWSLETTER_CONFIRMATION_TTL_HOURS) || 48,
  apiPublicUrl:
    process.env.API_PUBLIC_URL || `http://localhost:${port}/api/v1`,
  frontendPublicUrl: process.env.APP_PUBLIC_URL || 'http://localhost:5173',
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

/**
 * Fail fast in production when required runtime configuration is missing or unsafe.
 * Call from the process entrypoint before accepting traffic.
 */
function assertProductionConfig() {
  if (!isProduction) {
    return;
  }

  assertDatabaseConfig();

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  if (process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (corsOrigin.length === 0 || corsOrigin.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must be an explicit comma-separated allowlist in production.'
    );
  }

  if (email.transport === 'smtp' && !email.smtp.host) {
    throw new Error('SMTP_HOST must be set when EMAIL_TRANSPORT=smtp in production.');
  }

  if (email.transport !== 'smtp' && email.transport !== 'json') {
    throw new Error('EMAIL_TRANSPORT must be "smtp" or "json".');
  }
}

function getCorsOptions() {
  return {
    origin(origin, callback) {
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
  loginRateLimit,
  contactRateLimit,
  newsletterRateLimit,
  admissionsRateLimit,
  mediaRateLimit,
  media,
  jwt,
  email,
  newsletter,
  database,
  isProduction,
  assertDatabaseConfig,
  assertProductionConfig,
  getMissingDatabaseVariables,
  getCorsOptions,
};

module.exports = env;
