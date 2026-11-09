/**
 * Storage provider abstraction (local + in-memory S3 stub).
 * Does not require real cloud credentials.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.STORAGE_PROVIDER = 'local';

const storageService = require('../src/services/storage.service');
const { createLocalDriver } = require('../src/services/storage/local.driver');
const { assertSafeRelativeKey } = require('../src/services/storage.service');

function createMemoryS3Driver() {
  const objects = new Map();

  return {
    name: 's3',
    async ensureReady() {
      return 'memory-bucket';
    },
    async saveBuffer(relativeKey, buffer) {
      objects.set(relativeKey, Buffer.from(buffer));
      return { relativeKey, size: buffer.length };
    },
    async readBuffer(relativeKey) {
      const buf = objects.get(relativeKey);
      if (!buf) {
        const err = new Error('not found');
        err.code = 'MEDIA_FILE_NOT_FOUND';
        const AppError = require('../src/utils/AppError');
        throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
      }
      return Buffer.from(buf);
    },
    async openReadStream(relativeKey) {
      const buf = await this.readBuffer(relativeKey);
      return Readable.from(buf);
    },
    async deleteObject(relativeKey) {
      objects.delete(relativeKey);
    },
    async objectExists(relativeKey) {
      return objects.has(relativeKey);
    },
    getStorageRoot() {
      throw new Error('not local');
    },
    resolveAbsolutePath() {
      throw new Error('not local');
    },
    _objects: objects,
  };
}

describe('Storage provider abstraction', () => {
  let tmpDir;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abyssinia-storage-'));
  });

  after(async () => {
    storageService.setStorageDriverForTests(null);
    storageService.resetStorageDriverCache();
    storageService.setForceStorageFailureForTests(false);
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    storageService.setForceStorageFailureForTests(false);
  });

  it('rejects path traversal keys', () => {
    assert.throws(() => assertSafeRelativeKey('../etc/passwd'), (error) => {
      assert.equal(error.code, 'STORAGE_KEY_INVALID');
      return true;
    });
    assert.throws(() => assertSafeRelativeKey('/abs/path'), (error) => {
      assert.equal(error.code, 'STORAGE_KEY_INVALID');
      return true;
    });
  });

  it('local driver writes, reads, streams, and deletes', async () => {
    const local = createLocalDriver({
      storagePath: tmpDir,
      assertSafeRelativeKey,
    });
    storageService.setStorageDriverForTests(local);

    const saved = await storageService.saveBuffer({
      buffer: Buffer.from('hello-durable'),
      extension: 'txt',
    });
    assert.match(saved.relativeKey, /^\d{4}\/\d{2}\/[a-f0-9]+\.txt$/);

    const read = await storageService.readBuffer(saved.relativeKey);
    assert.equal(read.toString('utf8'), 'hello-durable');
    assert.equal(await storageService.objectExists(saved.relativeKey), true);

    const stream = await storageService.openReadStream(saved.relativeKey);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString('utf8'), 'hello-durable');

    await storageService.deleteObject(saved.relativeKey);
    assert.equal(await storageService.objectExists(saved.relativeKey), false);
  });

  it('memory s3 driver supports the same facade operations', async () => {
    const memory = createMemoryS3Driver();
    storageService.setStorageDriverForTests(memory);

    const saved = await storageService.saveBuffer({
      buffer: Buffer.from('%PDF-private'),
      extension: 'pdf',
    });
    assert.equal(memory._objects.has(saved.relativeKey), true);

    const read = await storageService.readBuffer(saved.relativeKey);
    assert.equal(read.toString('utf8'), '%PDF-private');

    await storageService.deleteObject(saved.relativeKey);
    assert.equal(await storageService.objectExists(saved.relativeKey), false);
  });

  it('force failure flag blocks writes without touching the driver map', async () => {
    const memory = createMemoryS3Driver();
    storageService.setStorageDriverForTests(memory);
    storageService.setForceStorageFailureForTests(true);

    await assert.rejects(
      () => storageService.saveBuffer({ buffer: Buffer.from('x'), extension: 'bin' }),
      (error) => {
        assert.equal(error.code, 'STORAGE_WRITE_FAILED');
        return true;
      }
    );
    assert.equal(memory._objects.size, 0);
  });

  it('rejects empty buffers', async () => {
    storageService.setStorageDriverForTests(createMemoryS3Driver());
    await assert.rejects(
      () => storageService.saveBuffer({ buffer: Buffer.alloc(0), extension: 'bin' }),
      (error) => {
        assert.equal(error.code, 'EMPTY_FILE');
        return true;
      }
    );
  });
});
