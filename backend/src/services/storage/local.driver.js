const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');
const AppError = require('../../utils/AppError');

function createLocalDriver({ storagePath, assertSafeRelativeKey }) {
  function getStorageRoot() {
    return storagePath;
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

  async function ensureReady() {
    await fs.mkdir(getStorageRoot(), { recursive: true });
    return getStorageRoot();
  }

  async function saveBuffer(relativeKey, buffer) {
    const absolutePath = resolveAbsolutePath(relativeKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer, { flag: 'wx' });
    return { relativeKey, size: buffer.length };
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

  async function objectExists(relativeKey) {
    try {
      await fs.access(resolveAbsolutePath(relativeKey));
      return true;
    } catch {
      return false;
    }
  }

  return {
    name: 'local',
    ensureReady,
    saveBuffer,
    readBuffer,
    openReadStream,
    deleteObject,
    objectExists,
    getStorageRoot,
    resolveAbsolutePath,
  };
}

module.exports = { createLocalDriver };
