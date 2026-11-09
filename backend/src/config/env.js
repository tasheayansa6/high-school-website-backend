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

/** Learning materials may be larger than CMS gallery images (default 15 MiB). */
const learningMaterials = {
  maxFileSizeBytes:
    Number(process.env.LEARNING_MATERIAL_MAX_FILE_SIZE_BYTES) || 15 * 1024 * 1024,
};

/**
 * Durable file storage.
 * - local: filesystem under MEDIA_STORAGE_PATH (dev / Railway Volume)
 * - s3: private S3-compatible bucket (AWS S3, Railway Buckets, R2, MinIO, …)
 * Metadata remains in MySQL; object keys are the relative storagePath values.
 */
const storageProvider = String(process.env.STORAGE_PROVIDER || 'local')
  .trim()
  .toLowerCase();

if (storageProvider !== 'local' && storageProvider !== 's3') {
  throw new Error('STORAGE_PROVIDER must be "local" or "s3".');
}

const storage = {
  provider: storageProvider,
  local: {
    storagePath: media.storagePath,
  },
  s3: {
    bucket: process.env.S3_BUCKET || process.env.BUCKET_NAME || '',
    region: process.env.S3_REGION || process.env.BUCKET_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || process.env.BUCKET_ENDPOINT || '',
    forcePathStyle:
      String(process.env.S3_FORCE_PATH_STYLE || 'true').toLowerCase() === 'true',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID || '',
    secretAccessKey:
      process.env.S3_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY || '',
    keyPrefix: process.env.S3_KEY_PREFIX || '',
  },
};

function assertStorageConfig() {
  if (storage.provider !== 's3') {
    return;
  }

  const missing = [];
  if (!storage.s3.bucket) missing.push('S3_BUCKET (or BUCKET_NAME)');
  if (!storage.s3.accessKeyId) missing.push('S3_ACCESS_KEY_ID (or BUCKET_ACCESS_KEY_ID)');
  if (!storage.s3.secretAccessKey) {
    missing.push('S3_SECRET_ACCESS_KEY (or BUCKET_SECRET_ACCESS_KEY)');
  }

  if (missing.length > 0) {
    const error = new Error(
      `STORAGE_PROVIDER=s3 requires: ${missing.join(', ')}`
    );
    error.code = 'STORAGE_CONFIG_INVALID';
    error.status = 500;
    throw error;
  }
}

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
  teacherAudience: process.env.JWT_TEACHER_AUDIENCE || 'high-school-teacher',
  studentAudience: process.env.JWT_STUDENT_AUDIENCE || 'high-school-student',
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

const WEAK_JWT_SECRETS = new Set([
  'replace-with-a-long-random-secret-32c',
  'dev-only-jwt-secret',
  'changeme',
  'change-me',
  'secret',
  'password',
  'jwt-secret',
  'your-secret-here',
]);

/**
 * Fail fast in production when required runtime configuration is missing or unsafe.
 * Call from the process entrypoint before accepting traffic.
 * Never logs secret values.
 */
function assertProductionConfig() {
  if (!isProduction) {
    return;
  }

  assertDatabaseConfig();

  const jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (WEAK_JWT_SECRETS.has(jwtSecret.toLowerCase()) || WEAK_JWT_SECRETS.has(jwtSecret)) {
    throw new Error(
      'JWT_SECRET appears to be a documented placeholder. Generate a unique random secret (≥ 32 characters) for production.'
    );
  }

  if (corsOrigin.length === 0 || corsOrigin.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must be an explicit comma-separated allowlist in production.'
    );
  }

  if (email.transport !== 'smtp' && email.transport !== 'json') {
    throw new Error('EMAIL_TRANSPORT must be "smtp" or "json".');
  }

  if (email.transport === 'smtp') {
    if (!email.smtp.host) {
      throw new Error('SMTP_HOST must be set when EMAIL_TRANSPORT=smtp in production.');
    }
    if (!email.smtp.user) {
      throw new Error('SMTP_USER must be set when EMAIL_TRANSPORT=smtp in production.');
    }
    if (!email.smtp.pass) {
      throw new Error('SMTP_PASS must be set when EMAIL_TRANSPORT=smtp in production.');
    }
  }

  assertStorageConfig();

  if (storage.provider === 'local') {
    console.warn(
      '[storage] STORAGE_PROVIDER=local in production: ensure MEDIA_STORAGE_PATH is on a persistent Railway Volume (or equivalent). Object storage (s3) is recommended for durable uploads.'
    );
  }

  if (process.env.TRUST_PROXY == null || String(process.env.TRUST_PROXY).trim() === '') {
    console.warn(
      '[proxy] TRUST_PROXY is unset in production. Behind Railway (or a single reverse-proxy hop), set TRUST_PROXY=1 so rate limiting uses the real client IP. Do not set TRUST_PROXY=true unless you understand the spoofing risk.'
    );
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

/**
 * Express `trust proxy` setting for correct client IPs behind reverse proxies.
 * - unset / empty → false (direct Node, local/dev)
 * - number → trust that many hops (e.g. 1 for Railway/nginx)
 * - true / "true" → trust all (avoid unless you understand the risk)
 */
function resolveTrustProxy() {
  const raw = process.env.TRUST_PROXY;
  if (raw == null || String(raw).trim() === '') {
    return false;
  }
  const value = String(raw).trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  const hops = Number(raw);
  if (Number.isInteger(hops) && hops >= 0) return hops;
  return false;
}

const trustProxy = resolveTrustProxy();

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
  learningMaterials,
  storage,
  jwt,
  email,
  newsletter,
  database,
  trustProxy,
  isProduction,
  assertDatabaseConfig,
  assertStorageConfig,
  assertProductionConfig,
  getMissingDatabaseVariables,
  getCorsOptions,
};

module.exports = env;
