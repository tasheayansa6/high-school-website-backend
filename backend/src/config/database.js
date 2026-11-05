const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma = null;
let isConnected = false;

function createPrismaClient() {
  const adapter = new PrismaMariaDb({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    connectionLimit: 5,
    connectTimeout: 5000,
    // Required for local MySQL 8 caching_sha2_password over TCP without TLS.
    allowPublicKeyRetrieval: true,
  });

  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
  }

  return prisma;
}

function logDatabaseFailure(error) {
  // Log only non-sensitive identifiers. Never print connection URLs or passwords.
  console.error('Database connection failed:', {
    code: error.code || error.errno || null,
    name: error.name || null,
  });
}

function createSafeDatabaseError(error) {
  const causeCode = error.code || error.errno || error.name || null;
  const looksLikeAuthFailure =
    causeCode === 'ER_ACCESS_DENIED_ERROR' ||
    causeCode === 1045 ||
    causeCode === 'P1000' ||
    causeCode === 'P2010';

  const message = looksLikeAuthFailure
    ? 'Unable to authenticate with MySQL. Check DATABASE_USER and DATABASE_PASSWORD in .env. Prisma may report this as an unknown authentication plugin even when the real issue is invalid credentials. Prefer the caching_sha2_password plugin for the database user.'
    : 'Unable to connect to the MySQL database. Verify that MySQL is running and that DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, and DATABASE_URL are set correctly in .env.';

  const safeError = new Error(message);
  safeError.code = 'DATABASE_CONNECTION_FAILED';
  safeError.status = 503;
  safeError.causeCode = causeCode;
  return safeError;
}

async function connectDatabase() {
  env.assertDatabaseConfig();

  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    logDatabaseFailure(error);
    throw createSafeDatabaseError(error);
  }
}

async function checkDatabaseConnection() {
  return connectDatabase();
}

async function disconnectDatabase() {
  if (!prisma) {
    isConnected = false;
    return;
  }

  try {
    await prisma.$disconnect();
  } finally {
    isConnected = false;
    prisma = null;
  }
}

function isDatabaseConnected() {
  return isConnected;
}

module.exports = {
  get prisma() {
    return getPrismaClient();
  },
  connectDatabase,
  checkDatabaseConnection,
  disconnectDatabase,
  isDatabaseConnected,
};
