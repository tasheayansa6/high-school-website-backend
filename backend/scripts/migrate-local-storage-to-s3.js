#!/usr/bin/env node
/**
 * Controlled migration: copy local filesystem objects referenced by MySQL metadata
 * into the configured S3-compatible bucket.
 *
 * Safety:
 * - Does not modify MySQL rows (storagePath keys stay the same).
 * - Does not delete local files unless --delete-local-after-verify is passed AND
 *   the remote object exists with matching size.
 * - Skips keys already present in the destination.
 *
 * Usage:
 *   STORAGE_PROVIDER=s3 ... node scripts/migrate-local-storage-to-s3.js [--dry-run]
 *   STORAGE_PROVIDER=s3 ... node scripts/migrate-local-storage-to-s3.js --delete-local-after-verify
 *
 * Requires local source files under MEDIA_STORAGE_PATH and a working S3 config.
 */

const fs = require('fs/promises');
const path = require('path');
const { prisma } = require('../src/config/database');
const env = require('../src/config/env');
const { createLocalDriver } = require('../src/services/storage/local.driver');
const { createS3Driver } = require('../src/services/storage/s3.driver');
const { assertSafeRelativeKey } = require('../src/services/storage.service');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const deleteLocal = args.has('--delete-local-after-verify');

async function collectKeys() {
  const [media, materials] = await Promise.all([
    prisma.mediaAsset.findMany({
      select: { id: true, storagePath: true, fileSize: true },
    }),
    prisma.learningMaterial.findMany({
      select: { id: true, storagePath: true, fileSize: true },
    }),
  ]);

  const map = new Map();
  for (const row of media) {
    if (row.storagePath) {
      map.set(row.storagePath, {
        key: row.storagePath,
        expectedSize: row.fileSize,
        refs: [`media:${row.id}`],
      });
    }
  }
  for (const row of materials) {
    if (!row.storagePath) continue;
    const existing = map.get(row.storagePath);
    if (existing) {
      existing.refs.push(`learningMaterial:${row.id}`);
    } else {
      map.set(row.storagePath, {
        key: row.storagePath,
        expectedSize: row.fileSize,
        refs: [`learningMaterial:${row.id}`],
      });
    }
  }
  return [...map.values()];
}

async function main() {
  env.assertStorageConfig();

  if (env.storage.provider !== 's3') {
    console.error('Set STORAGE_PROVIDER=s3 (with bucket credentials) before migrating.');
    process.exit(1);
  }

  const local = createLocalDriver({
    storagePath: env.storage.local.storagePath,
    assertSafeRelativeKey,
  });
  const s3 = createS3Driver({
    bucket: env.storage.s3.bucket,
    region: env.storage.s3.region,
    endpoint: env.storage.s3.endpoint,
    forcePathStyle: env.storage.s3.forcePathStyle,
    accessKeyId: env.storage.s3.accessKeyId,
    secretAccessKey: env.storage.s3.secretAccessKey,
    keyPrefix: env.storage.s3.keyPrefix,
    assertSafeRelativeKey,
  });

  await local.ensureReady();
  await s3.ensureReady();

  const items = await collectKeys();
  console.log(`Found ${items.length} unique storage key(s). dryRun=${dryRun} deleteLocal=${deleteLocal}`);

  let copied = 0;
  let skipped = 0;
  let missingLocal = 0;
  let failed = 0;

  for (const item of items) {
    const key = item.key;
    const localExists = await local.objectExists(key);
    if (!localExists) {
      console.warn(`MISSING_LOCAL ${key} refs=${item.refs.join(',')}`);
      missingLocal += 1;
      continue;
    }

    const already = await s3.objectExists(key);
    if (already) {
      console.log(`SKIP_EXISTS ${key}`);
      skipped += 1;
      if (deleteLocal && !dryRun) {
        await local.deleteObject(key);
        console.log(`DELETED_LOCAL ${key}`);
      }
      continue;
    }

    if (dryRun) {
      console.log(`WOULD_COPY ${key} size=${item.expectedSize}`);
      copied += 1;
      continue;
    }

    try {
      const buffer = await local.readBuffer(key);
      if (item.expectedSize && buffer.length !== item.expectedSize) {
        console.warn(
          `SIZE_MISMATCH_LOCAL ${key} disk=${buffer.length} meta=${item.expectedSize}`
        );
      }
      await s3.saveBuffer(key, buffer);
      const verified = await s3.objectExists(key);
      if (!verified) {
        throw new Error('Post-upload HeadObject failed');
      }
      console.log(`COPIED ${key}`);
      copied += 1;
      if (deleteLocal) {
        await local.deleteObject(key);
        console.log(`DELETED_LOCAL ${key}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${key}: ${error.message || error}`);
    }
  }

  console.log(
    JSON.stringify(
      { copied, skipped, missingLocal, failed, dryRun, deleteLocal, localRoot: path.resolve(env.storage.local.storagePath) },
      null,
      2
    )
  );

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error.message || error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
