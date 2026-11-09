const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const AppError = require('../../utils/AppError');

function createS3Driver({
  bucket,
  region,
  endpoint,
  forcePathStyle,
  accessKeyId,
  secretAccessKey,
  keyPrefix,
  assertSafeRelativeKey,
}) {
  const clientConfig = {
    region: region || 'auto',
  };

  if (endpoint) {
    clientConfig.endpoint = endpoint;
  }

  if (forcePathStyle) {
    clientConfig.forcePathStyle = true;
  }

  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  const client = new S3Client(clientConfig);
  const prefix = String(keyPrefix || '')
    .replace(/^\/+/, '')
    .replace(/\/?$/, (m) => (m ? '/' : ''));

  function toObjectKey(relativeKey) {
    const safeKey = assertSafeRelativeKey(relativeKey);
    return `${prefix}${safeKey}`;
  }

  async function ensureReady() {
    // Connectivity is verified lazily on first operation; avoid listing the bucket
    // (would require broader permissions and could expose object names in logs).
    if (!bucket) {
      throw new AppError('Object storage bucket is not configured.', 503, {
        code: 'STORAGE_CONFIG_INVALID',
      });
    }
    return bucket;
  }

  async function saveBuffer(relativeKey, buffer) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: toObjectKey(relativeKey),
          Body: buffer,
          ContentLength: buffer.length,
        })
      );
      return { relativeKey, size: buffer.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to store uploaded file.', 503, {
        code: 'STORAGE_WRITE_FAILED',
      });
    }
  }

  async function readBuffer(relativeKey) {
    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: toObjectKey(relativeKey),
        })
      );
      const bytes = await result.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      if (error && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
        throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
      }
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to read media file.', 503, { code: 'STORAGE_READ_FAILED' });
    }
  }

  async function openReadStream(relativeKey) {
    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: toObjectKey(relativeKey),
        })
      );
      const body = result.Body;
      if (!body) {
        throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
      }
      if (typeof body.pipe === 'function') {
        return body;
      }
      // SDK may return async iterable in some runtimes.
      return Readable.from(body);
    } catch (error) {
      if (error && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
        throw new AppError('Media file not found.', 404, { code: 'MEDIA_FILE_NOT_FOUND' });
      }
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to read media file.', 503, { code: 'STORAGE_READ_FAILED' });
    }
  }

  async function deleteObject(relativeKey) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: toObjectKey(relativeKey),
        })
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Delete of missing keys is typically a no-op on S3; treat other errors as failure.
      if (error && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
        return;
      }
      throw new AppError('Failed to delete media file.', 503, { code: 'STORAGE_DELETE_FAILED' });
    }
  }

  async function objectExists(relativeKey) {
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: toObjectKey(relativeKey),
        })
      );
      return true;
    } catch (error) {
      if (error && (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)) {
        return false;
      }
      throw new AppError('Failed to check media file.', 503, { code: 'STORAGE_READ_FAILED' });
    }
  }

  function getStorageRoot() {
    throw new AppError('getStorageRoot is only available for the local storage provider.', 500, {
      code: 'STORAGE_PROVIDER_MISMATCH',
    });
  }

  function resolveAbsolutePath() {
    throw new AppError(
      'resolveAbsolutePath is only available for the local storage provider.',
      500,
      { code: 'STORAGE_PROVIDER_MISMATCH' }
    );
  }

  return {
    name: 's3',
    ensureReady,
    saveBuffer,
    readBuffer,
    openReadStream,
    deleteObject,
    objectExists,
    getStorageRoot,
    resolveAbsolutePath,
    /** @internal test helper */
    _toObjectKey: toObjectKey,
  };
}

module.exports = { createS3Driver };
