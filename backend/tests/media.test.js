const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
process.env.MEDIA_RATE_LIMIT_MAX = process.env.MEDIA_RATE_LIMIT_MAX || '1000';
process.env.MEDIA_MAX_FILE_SIZE_BYTES = process.env.MEDIA_MAX_FILE_SIZE_BYTES || '2048';
process.env.MEDIA_STORAGE_PATH =
  process.env.MEDIA_STORAGE_PATH ||
  path.join(process.cwd(), 'storage', 'test-uploads');

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const storageService = require('../src/services/storage.service');
const mediaService = require('../src/services/media.service');

const PASSWORD = 'Phase12TestPass1';
const emails = {
  super: 'phase12.super@example.com',
  editor: 'phase12.editor@example.com',
  communicator: 'phase12.comms@example.com',
};

// Minimal valid 1x1 PNG
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const JPEG_BUFFER = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('JFIF'),
  Buffer.alloc(32, 0),
  Buffer.from([0xff, 0xd9]),
]);

const createdMediaIds = [];
const createdPostIds = [];
const createdEventIds = [];
const createdCategoryIds = [];

async function ensureRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
}

async function upsertAdmin({ email, roleSlug }) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  const passwordHash = await hashPassword(PASSWORD);
  const existing = await prisma.admin.findFirst({ where: { email } });

  if (existing) {
    return prisma.admin.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: 'Phase12',
        lastName: 'Tester',
        isActive: true,
        deletedAt: null,
        tokenVersion: 0,
        roleId: role.id,
      },
    });
  }

  return prisma.admin.create({
    data: {
      email,
      passwordHash,
      firstName: 'Phase12',
      lastName: 'Tester',
      roleId: role.id,
    },
  });
}

async function login(email) {
  const res = await request(app)
    .post('/api/v1/admin/auth/login')
    .send({ email, password: PASSWORD });
  assert.equal(res.status, 200, res.body.message);
  return res.body.data.accessToken;
}

async function cleanup() {
  if (createdPostIds.length) {
    await prisma.blogPost.deleteMany({ where: { id: { in: createdPostIds } } });
  }
  if (createdEventIds.length) {
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  }
  if (createdCategoryIds.length) {
    await prisma.blogCategory.deleteMany({ where: { id: { in: createdCategoryIds } } });
  }

  if (createdMediaIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'MediaAsset',
        entityId: { in: createdMediaIds.map(String) },
      },
    });

    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: createdMediaIds } },
    });
    for (const asset of assets) {
      await storageService.deleteObject(asset.storagePath).catch(() => {});
    }
    await prisma.mediaAsset.deleteMany({ where: { id: { in: createdMediaIds } } });
  }

  await prisma.blogPost.deleteMany({ where: { slug: { startsWith: 'phase12-' } } });
  await prisma.event.deleteMany({ where: { slug: { startsWith: 'phase12-' } } });
  await prisma.blogCategory.deleteMany({ where: { slug: { startsWith: 'phase12-' } } });
  await prisma.mediaAsset.deleteMany({
    where: { originalName: { startsWith: 'phase12-' } },
  });
  await prisma.admin.deleteMany({ where: { email: { in: Object.values(emails) } } });

  createdMediaIds.length = 0;
  createdPostIds.length = 0;
  createdEventIds.length = 0;
  createdCategoryIds.length = 0;

  storageService.setForceStorageFailureForTests(false);
  mediaService.setForceDatabaseFailureForTests(false);
}

describe('Phase 12 media module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let mediaId;
  let mediaUrl;

  before(async () => {
    await connectDatabase();
    await storageService.ensureStorageReady();
    await ensureRoles();
    await cleanup();

    await upsertAdmin({ email: emails.super, roleSlug: ROLE_SLUGS.SUPER_ADMIN });
    await upsertAdmin({ email: emails.editor, roleSlug: ROLE_SLUGS.CONTENT_EDITOR });
    await upsertAdmin({
      email: emails.communicator,
      roleSlug: ROLE_SLUGS.COMMUNICATION_MANAGER,
    });

    superToken = await login(emails.super);
    editorToken = await login(emails.editor);
    communicatorToken = await login(emails.communicator);
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('rejects unauthenticated upload', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .attach('file', PNG_BUFFER, 'phase12-campus.png');
    assert.equal(res.status, 401);
  });

  it('denies Communication Manager media access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/media')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('uploads an image as Content Editor', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .field('altText', 'Campus entrance')
      .attach('file', PNG_BUFFER, 'phase12-campus.png');

    assert.equal(res.status, 201);
    assert.equal(res.body.data.media.mimeType, 'image/png');
    assert.equal(res.body.data.media.originalName, 'phase12-campus.png');
    assert.ok(res.body.data.media.url.includes('/media/'));
    assert.equal(res.body.data.media.storagePath, undefined);
    mediaId = res.body.data.media.id;
    mediaUrl = res.body.data.media.url;
    createdMediaIds.push(mediaId);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'MediaAsset',
        entityId: String(mediaId),
        action: 'media.upload',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('allows duplicate original filenames with unique storage names', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', PNG_BUFFER, 'phase12-campus.png');

    assert.equal(res.status, 201);
    assert.equal(res.body.data.media.originalName, 'phase12-campus.png');
    assert.notEqual(res.body.data.media.fileName, (
      await prisma.mediaAsset.findUnique({ where: { id: mediaId } })
    ).fileName);
    createdMediaIds.push(res.body.data.media.id);
  });

  it('rejects missing file', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .field('altText', 'No file');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'FILE_REQUIRED');
  });

  it('rejects unsupported file type', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', Buffer.from('#!/bin/bash\necho hack'), 'phase12-bad.sh');
    assert.equal(res.status, 415);
    assert.equal(res.body.code, 'UNSUPPORTED_FILE_TYPE');
  });

  it('rejects invalid MIME disguise (text as png)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'phase12-fake.png',
        contentType: 'image/png',
      });
    assert.equal(res.status, 415);
  });

  it('rejects oversized files', async () => {
    const oversized = Buffer.concat([PNG_BUFFER, Buffer.alloc(3000, 1)]);
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', oversized, 'phase12-big.png');
    assert.equal(res.status, 413);
    assert.equal(res.body.code, 'FILE_TOO_LARGE');
  });

  it('handles storage failure without creating a database record', async () => {
    const before = await prisma.mediaAsset.count();
    storageService.setForceStorageFailureForTests(true);
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', JPEG_BUFFER, 'phase12-storage-fail.jpg');
    storageService.setForceStorageFailureForTests(false);

    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'STORAGE_WRITE_FAILED');
    assert.equal(await prisma.mediaAsset.count(), before);
  });

  it('cleans up stored files when database persistence fails', async () => {
    const root = storageService.getStorageRoot();
    const beforeFiles = await listFilesRecursive(root);

    mediaService.setForceDatabaseFailureForTests(true);
    const res = await request(app)
      .post('/api/v1/admin/media/upload')
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', PNG_BUFFER, 'phase12-db-fail.png');
    mediaService.setForceDatabaseFailureForTests(false);

    assert.equal(res.status, 500);
    assert.equal(res.body.code, 'MEDIA_PERSIST_FAILED');

    const afterFiles = await listFilesRecursive(root);
    assert.deepEqual(afterFiles.sort(), beforeFiles.sort());
  });

  it('lists media with pagination, search, and mime filtering', async () => {
    const list = await request(app)
      .get('/api/v1/admin/media')
      .query({ page: 1, limit: 1, sortOrder: 'desc' })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(list.status, 200);
    assert.equal(list.body.data.pagination.limit, 1);
    assert.ok(list.body.data.items.length <= 1);

    const search = await request(app)
      .get('/api/v1/admin/media')
      .query({ q: 'phase12-campus' })
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(search.status, 200);
    assert.ok(search.body.data.items.length >= 1);

    const filtered = await request(app)
      .get('/api/v1/admin/media')
      .query({ mimeType: 'image/png' })
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.data.items.every((item) => item.mimeType === 'image/png'));
  });

  it('retrieves and updates media metadata', async () => {
    const detail = await request(app)
      .get(`/api/v1/admin/media/${mediaId}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.media.id, mediaId);
    assert.equal(detail.body.data.media.storagePath, undefined);

    const updated = await request(app)
      .patch(`/api/v1/admin/media/${mediaId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        altText: 'Updated campus photo',
        description: 'Main entrance',
        isGalleryImage: true,
      });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.media.altText, 'Updated campus photo');
    assert.equal(updated.body.data.media.isGalleryImage, true);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'MediaAsset',
        entityId: String(mediaId),
        action: 'media.update',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('retrieves an approved asset publicly', async () => {
    const pathOnly = mediaUrl.replace(/^https?:\/\/[^/]+/, '');
    const res = await request(app).get(pathOnly);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /image\/png/);
    assert.ok(Buffer.isBuffer(res.body) || res.body);
  });

  it('returns 404 for missing public media', async () => {
    const res = await request(app).get('/api/v1/media/999999/content');
    assert.equal(res.status, 404);
  });

  it('rejects unsafe storage keys', async () => {
    assert.throws(() => storageService.resolveAbsolutePath('../etc/passwd'), (error) => {
      assert.equal(error.code, 'STORAGE_KEY_INVALID');
      return true;
    });
  });

  it('prevents deleting media referenced by published blog and event content', async () => {
    const category = await prisma.blogCategory.create({
      data: {
        name: 'Phase12 Category',
        slug: 'phase12-category',
      },
    });
    createdCategoryIds.push(category.id);

    const author = await prisma.admin.findFirst({ where: { email: emails.editor } });

    const post = await prisma.blogPost.create({
      data: {
        title: 'Phase12 Post',
        slug: 'phase12-post',
        content: 'Uses featured media.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: author.id,
        categoryId: category.id,
        featuredImageId: mediaId,
      },
    });
    createdPostIds.push(post.id);

    const event = await prisma.event.create({
      data: {
        title: 'Phase12 Event',
        slug: 'phase12-event',
        description: 'Uses featured media.',
        startsAt: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        featuredImageId: mediaId,
        createdById: author.id,
      },
    });
    createdEventIds.push(event.id);

    const blocked = await request(app)
      .delete(`/api/v1/admin/media/${mediaId}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'MEDIA_IN_USE');

    const publicBlog = await request(app).get('/api/v1/blog/posts/phase12-post');
    assert.equal(publicBlog.status, 200);
    assert.equal(publicBlog.body.data.post.featuredImage.id, mediaId);
    assert.ok(publicBlog.body.data.post.featuredImage.url.includes(`/media/${mediaId}/content`));
    assert.equal(publicBlog.body.data.post.featuredImage.storagePath, undefined);

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { featuredImageId: null },
    });
    await prisma.event.update({
      where: { id: event.id },
      data: { featuredImageId: null },
    });
  });

  it('soft-deletes media and blocks public access', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/media/${mediaId}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.media.deletedAt);

    const publicRes = await request(app).get(`/api/v1/media/${mediaId}/content`);
    assert.equal(publicRes.status, 404);

    const list = await request(app)
      .get('/api/v1/admin/media')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(list.body.data.items.some((item) => item.id === mediaId), false);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'MediaAsset',
        entityId: String(mediaId),
        action: 'media.delete',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('rejects restore by Content Editor', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/media/${mediaId}/restore`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores media as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/media/${mediaId}/restore`)
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.media.deletedAt, null);

    const publicRes = await request(app).get(`/api/v1/media/${mediaId}/content`);
    assert.equal(publicRes.status, 200);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'MediaAsset',
        entityId: String(mediaId),
        action: 'media.restore',
      },
    });
    assert.ok(logs.length >= 1);
  });
});

async function listFilesRecursive(dir) {
  const results = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (_error) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        results.push(path.relative(dir, full));
      }
    }
  }
  await walk(dir);
  return results;
}
