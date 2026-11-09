const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { createLocalDriver } = require('./storage/local.driver');
const { createS3Driver } = require('./storage/s3.driver');

let forceFailureForTests = false;
let driverOverrideForTests = null;

function setForceStorageFailureForTests(value) {
  forceFailureForTests = Boolean(value);
}

function setStorageDriverForTests(driver) {
  driverOverrideForTests = driver;
}

function assertSafeRelativeKey(relativeKey) {
  if (!relativeKey || typeof relativeKey !== 'string') {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  if (relativeKey.includes('\0') || path.isAbsolute(relativeKey)) {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  const normalized = path.normalize(relativeKey).replace(/\\/g, '/');
  const segments = normalized.split('/');

  if (segments.includes('..') || normalized.startsWith('..')) {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  return normalized;
}

function buildDriver() {
  const cfg = env.storage;

  if (cfg.provider === 's3') {
    return createS3Driver({
      bucket: cfg.s3.bucket,
      region: cfg.s3.region,
      endpoint: cfg.s3.endpoint,
      forcePathStyle: cfg.s3.forcePathStyle,
      accessKeyId: cfg.s3.accessKeyId,
      secretAccessKey: cfg.s3.secretAccessKey,
      keyPrefix: cfg.s3.keyPrefix,
      assertSafeRelativeKey,
    });
  }

  return createLocalDriver({
    storagePath: cfg.local.storagePath,
    assertSafeRelativeKey,
  });
}

let cachedDriver = null;

function getDriver() {
  if (driverOverrideForTests) {
    return driverOverrideForTests;
  }
  if (!cachedDriver) {
    cachedDriver = buildDriver();
  }
  return cachedDriver;
}

/** Reset cached driver after env changes in tests. */
function resetStorageDriverCache() {
  cachedDriver = null;
}

function getProviderName() {
  return getDriver().name;
}

function getStorageRoot() {
  return getDriver().getStorageRoot();
}

function resolveAbsolutePath(relativeKey) {
  return getDriver().resolveAbsolutePath(relativeKey);
}

function generateStorageKey(extension) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const token = crypto.randomBytes(16).toString('hex');
  const ext = String(extension || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${year}/${month}/${token}.${ext}`;
}

async function ensureStorageReady() {
  return getDriver().ensureReady();
}

async function saveBuffer({ buffer, extension }) {
  if (forceFailureForTests) {
    throw new AppError('Storage write failed.', 503, { code: 'STORAGE_WRITE_FAILED' });
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Empty file upload.', 400, { code: 'EMPTY_FILE' });
  }

  const relativeKey = generateStorageKey(extension);
  return getDriver().saveBuffer(relativeKey, buffer);
}

async function readBuffer(relativeKey) {
  return getDriver().readBuffer(relativeKey);
}

async function openReadStream(relativeKey) {
  return getDriver().openReadStream(relativeKey);
}

async function deleteObject(relativeKey) {
  return getDriver().deleteObject(relativeKey);
}

async function objectExists(relativeKey) {
  return getDriver().objectExists(relativeKey);
}

module.exports = {
  ensureStorageReady,
  saveBuffer,
  readBuffer,
  openReadStream,
  deleteObject,
  objectExists,
  resolveAbsolutePath,
  getStorageRoot,
  getProviderName,
  generateStorageKey,
  assertSafeRelativeKey,
  setForceStorageFailureForTests,
  setStorageDriverForTests,
  resetStorageDriverCache,
};
