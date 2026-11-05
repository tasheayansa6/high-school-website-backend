const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');

let forceFailureForTests = false;

function setForceStorageFailureForTests(value) {
  forceFailureForTests = Boolean(value);
}

function getStorageRoot() {
  return env.media.storagePath;
}

async function ensureStorageReady() {
  const root = getStorageRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

function assertSafeRelativeKey(relativeKey) {
  if (!relativeKey || typeof relativeKey !== 'string') {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  if (relativeKey.includes('\0') || path.isAbsolute(relativeKey)) {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  const normalized = path.normalize(relativeKey);
  const segments = normalized.split(path.sep);

  if (segments.includes('..') || normalized.startsWith('..')) {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  return normalized.replace(/\\/g, '/');
}

function resolveAbsolutePath(relativeKey) {
  const safeKey = assertSafeRelativeKey(relativeKey);
  const root = path.resolve(getStorageRoot());
  const absolute = path.resolve(root, safeKey);

  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new AppError('Invalid storage key.', 400, { code: 'STORAGE_KEY_INVALID' });
  }

  return absolute;
}

function generateStorageKey(extension) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const token = crypto.randomBytes(16).toString('hex');
  const ext = String(extension || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${year}/${month}/${token}.${ext}`;
}

/**
 * Persist a buffer under a unique relative key.
 * Returns only the relative storage key (never an absolute path for API use).
 */
async function saveBuffer({ buffer, extension }) {
  if (forceFailureForTests) {
    throw new AppError('Storage write failed.', 503, { code: 'STORAGE_WRITE_FAILED' });
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Empty file upload.', 400, { code: 'EMPTY_FILE' });
  }

  const relativeKey = generateStorageKey(extension);
  const absolutePath = resolveAbsolutePath(relativeKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer, { flag: 'wx' });

  return {
    relativeKey,
    size: buffer.length,
  };
}

async function readBuffer(relativeKey) {
  const absolutePath = resolveAbsolutePath(relativeKey);
  try {
    return await fs.readFile(absolutePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
    }
    throw new AppError('Failed to read media file.', 503, { code: 'STORAGE_READ_FAILED' });
  }
}

async function openReadStream(relativeKey) {
  const absolutePath = resolveAbsolutePath(relativeKey);
  if (!fssync.existsSync(absolutePath)) {
    throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
  }
  return fssync.createReadStream(absolutePath);
}

async function deleteObject(relativeKey) {
  try {
    const absolutePath = resolveAbsolutePath(relativeKey);
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete media file.', 503, { code: 'STORAGE_DELETE_FAILED' });
  }
}

module.exports = {
  ensureStorageReady,
  saveBuffer,
  readBuffer,
  openReadStream,
  deleteObject,
  resolveAbsolutePath,
  getStorageRoot,
  generateStorageKey,
  setForceStorageFailureForTests,
};
