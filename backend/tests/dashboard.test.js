const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const { sanitizeAuditMetadata } = require('../src/services/dashboard.service');
const { generateMediaPublicId } = require('../src/utils/mediaPublicId');

const PASSWORD = 'Phase14TestPass1';
const emails = {
  super: 'phase14.super@example.com',
  editor: 'phase14.editor@example.com',
  communicator: 'phase14.comms@example.com',
};

const created = {
  pageIds: [],
  postIds: [],
  categoryIds: [],
  contactIds: [],
  subscriberIds: [],
  inquiryIds: [],
  eventIds: [],
  mediaIds: [],
  auditIds: [],
};

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
        firstName: 'Phase14',
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
      firstName: 'Phase14',
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
  if (created.auditIds.length) {
    await prisma.auditLog.deleteMany({ where: { id: { in: created.auditIds } } });
  }
  if (created.postIds.length) {
    await prisma.blogPost.deleteMany({ where: { id: { in: created.postIds } } });
  }
  if (created.categoryIds.length) {
    await prisma.blogCategory.deleteMany({ where: { id: { in: created.categoryIds } } });
  }
  if (created.pageIds.length) {
    await prisma.page.deleteMany({ where: { id: { in: created.pageIds } } });
  }
  if (created.eventIds.length) {
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
  }
  if (created.mediaIds.length) {
    await prisma.mediaAsset.deleteMany({ where: { id: { in: created.mediaIds } } });
  }
  if (created.contactIds.length) {
    await prisma.contactMessage.deleteMany({ where: { id: { in: created.contactIds } } });
  }
  if (created.subscriberIds.length) {
    await prisma.newsletterSubscriber.deleteMany({
      where: { id: { in: created.subscriberIds } },
    });
  }
  if (created.inquiryIds.length) {
    await prisma.admissionInquiry.deleteMany({ where: { id: { in: created.inquiryIds } } });
  }

  await prisma.page.deleteMany({ where: { slug: { startsWith: 'phase14-' } } });
  await prisma.blogPost.deleteMany({ where: { slug: { startsWith: 'phase14-' } } });
  await prisma.blogCategory.deleteMany({ where: { slug: { startsWith: 'phase14-' } } });
  await prisma.event.deleteMany({ where: { slug: { startsWith: 'phase14-' } } });
  await prisma.newsletterSubscriber.deleteMany({
    where: { email: { startsWith: 'phase14.' } },
  });
  await prisma.contactMessage.deleteMany({
    where: { email: { startsWith: 'phase14.' } },
  });
  await prisma.admissionInquiry.deleteMany({
    where: { email: { startsWith: 'phase14.' } },
  });
  await prisma.mediaAsset.deleteMany({
    where: { originalName: { startsWith: 'phase14-' } },
  });

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });

  for (const key of Object.keys(created)) {
    created[key].length = 0;
  }
}

describe('Phase 14 dashboard module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let adminUser;

  before(async () => {
    await connectDatabase();
    await ensureRoles();
    await cleanup();

    adminUser = await upsertAdmin({
      email: emails.super,
      roleSlug: ROLE_SLUGS.SUPER_ADMIN,
    });
    await upsertAdmin({ email: emails.editor, roleSlug: ROLE_SLUGS.CONTENT_EDITOR });
    await upsertAdmin({
      email: emails.communicator,
      roleSlug: ROLE_SLUGS.COMMUNICATION_MANAGER,
    });

    superToken = await login(emails.super);
    editorToken = await login(emails.editor);
    communicatorToken = await login(emails.communicator);

    const publishedPage = await prisma.page.create({
      data: {
        title: 'Phase14 Published',
        slug: 'phase14-published',
        content: 'Published page',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    created.pageIds.push(publishedPage.id);

    const draftPage = await prisma.page.create({
      data: {
        title: 'Phase14 Draft',
        slug: 'phase14-draft',
        content: 'Draft page',
        status: 'DRAFT',
      },
    });
    created.pageIds.push(draftPage.id);

    const deletedPage = await prisma.page.create({
      data: {
        title: 'Phase14 Deleted',
        slug: 'phase14-deleted',
        content: 'Deleted page',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        deletedAt: new Date(),
      },
    });
    created.pageIds.push(deletedPage.id);

    const category = await prisma.blogCategory.create({
      data: { name: 'Phase14 Cat', slug: 'phase14-cat' },
    });
    created.categoryIds.push(category.id);

    const publishedPost = await prisma.blogPost.create({
      data: {
        title: 'Phase14 Post',
        slug: 'phase14-post',
        content: 'Published post',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: adminUser.id,
        categoryId: category.id,
      },
    });
    created.postIds.push(publishedPost.id);

    const draftPost = await prisma.blogPost.create({
      data: {
        title: 'Phase14 Draft Post',
        slug: 'phase14-draft-post',
        content: 'Draft post',
        status: 'DRAFT',
        authorId: adminUser.id,
        categoryId: category.id,
      },
    });
    created.postIds.push(draftPost.id);

    const contactNew = await prisma.contactMessage.create({
      data: {
        name: 'Phase14 Parent',
        email: 'phase14.parent@example.com',
        subject: 'Hello',
        message: 'Private message body should not appear in dashboard',
        status: 'NEW',
      },
    });
    created.contactIds.push(contactNew.id);

    const contactRead = await prisma.contactMessage.create({
      data: {
        name: 'Phase14 Parent 2',
        email: 'phase14.parent2@example.com',
        subject: 'Read',
        message: 'Already read',
        status: 'READ',
      },
    });
    created.contactIds.push(contactRead.id);

    const activeSub = await prisma.newsletterSubscriber.create({
      data: {
        email: 'phase14.active@example.com',
        status: 'ACTIVE',
        confirmedAt: new Date(),
      },
    });
    created.subscriberIds.push(activeSub.id);

    const pendingSub = await prisma.newsletterSubscriber.create({
      data: {
        email: 'phase14.pending@example.com',
        status: 'PENDING',
      },
    });
    created.subscriberIds.push(pendingSub.id);

    const deletedSub = await prisma.newsletterSubscriber.create({
      data: {
        email: 'phase14.deleted-sub@example.com',
        status: 'ACTIVE',
        deletedAt: new Date(),
      },
    });
    created.subscriberIds.push(deletedSub.id);

    const inquiry = await prisma.admissionInquiry.create({
      data: {
        studentName: 'Phase14 Student',
        email: 'phase14.inquiry@example.com',
        phone: '+251911000111',
        gradeApplyingFor: 'Grade 9',
        academicYear: '2026/2027',
        message: 'Private admissions message',
        status: 'NEW',
      },
    });
    created.inquiryIds.push(inquiry.id);

    const upcoming = await prisma.event.create({
      data: {
        title: 'Phase14 Upcoming',
        slug: 'phase14-upcoming',
        description: 'Future event',
        startsAt: new Date(Date.now() + 7 * 86400000),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: adminUser.id,
      },
    });
    created.eventIds.push(upcoming.id);

    const past = await prisma.event.create({
      data: {
        title: 'Phase14 Past',
        slug: 'phase14-past',
        description: 'Past event',
        startsAt: new Date(Date.now() - 7 * 86400000),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: adminUser.id,
      },
    });
    created.eventIds.push(past.id);

    const media = await prisma.mediaAsset.create({
      data: {
        fileName: 'phase14.png',
        originalName: 'phase14-campus.png',
        mimeType: 'image/png',
        fileSize: 100,
        storagePath: 'phase14/test.png',
        publicId: generateMediaPublicId(),
        uploadedById: adminUser.id,
      },
    });
    created.mediaIds.push(media.id);

    const deletedMedia = await prisma.mediaAsset.create({
      data: {
        fileName: 'phase14-deleted.png',
        originalName: 'phase14-deleted.png',
        mimeType: 'image/png',
        fileSize: 50,
        storagePath: 'phase14/deleted.png',
        publicId: generateMediaPublicId(),
        deletedAt: new Date(),
        uploadedById: adminUser.id,
      },
    });
    created.mediaIds.push(deletedMedia.id);

    const audit = await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'pages.publish',
        entityType: 'Page',
        entityId: String(publishedPage.id),
        metadata: {
          slug: 'phase14-published',
          secretToken: 'should-not-leak',
          message: 'full private body',
        },
      },
    });
    created.auditIds.push(audit.id);
  });

  after(async () => {
    await cleanup();
    await disconnectDatabase();
  });

  it('rejects unauthenticated dashboard access', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard/overview');
    assert.equal(res.status, 401);
  });

  it('allows Super Admin, Content Editor, and Communication Manager', async () => {
    for (const token of [superToken, editorToken, communicatorToken]) {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/overview')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200);
    }
  });

  it('returns overview statistics from the database', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    const overview = res.body.data.overview;

    assert.ok(overview.pages.published >= 1);
    assert.ok(overview.pages.draft >= 1);
    assert.ok(overview.blogPosts.published >= 1);
    assert.ok(overview.blogPosts.draft >= 1);
    assert.ok(overview.contactMessages.total >= 2);
    assert.ok(overview.contactMessages.new >= 1);
    assert.ok(overview.newsletterSubscribers.total >= 2);
    assert.ok(overview.newsletterSubscribers.active >= 1);
    assert.ok(overview.newsletterSubscribers.pending >= 1);
    assert.ok(overview.admissionInquiries.total >= 1);
    assert.ok(overview.admissionInquiries.new >= 1);
    assert.ok(overview.events.upcomingPublished >= 1);
    assert.ok(overview.mediaAssets.total >= 1);
  });

  it('excludes soft-deleted records from ordinary statistics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${editorToken}`);

    const overview = res.body.data.overview;

    // Deleted published page must not inflate published count beyond live rows.
    const livePublishedPages = await prisma.page.count({
      where: { deletedAt: null, status: 'PUBLISHED', slug: { startsWith: 'phase14-' } },
    });
    const allPublishedIncludingDeleted = await prisma.page.count({
      where: { status: 'PUBLISHED', slug: { startsWith: 'phase14-' } },
    });
    assert.ok(allPublishedIncludingDeleted > livePublishedPages);
    assert.ok(overview.pages.published >= livePublishedPages);

    const liveSubscribers = await prisma.newsletterSubscriber.count({
      where: { deletedAt: null, email: { startsWith: 'phase14.' } },
    });
    const allSubscribers = await prisma.newsletterSubscriber.count({
      where: { email: { startsWith: 'phase14.' } },
    });
    assert.ok(allSubscribers > liveSubscribers);

    const liveMedia = await prisma.mediaAsset.count({
      where: { deletedAt: null, originalName: { startsWith: 'phase14-' } },
    });
    const allMedia = await prisma.mediaAsset.count({
      where: { originalName: { startsWith: 'phase14-' } },
    });
    assert.ok(allMedia > liveMedia);
    assert.ok(overview.mediaAssets.total >= liveMedia);
  });

  it('returns content counts by status', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/content-statistics')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    const stats = res.body.data.statistics;
    assert.ok(stats.pages.byStatus.PUBLISHED >= 1);
    assert.ok(stats.pages.byStatus.DRAFT >= 1);
    assert.ok(stats.blogPosts.byStatus.PUBLISHED >= 1);
    assert.ok(stats.blogPosts.byStatus.DRAFT >= 1);
    assert.ok(stats.blogCategories.total >= 1);
    assert.ok(stats.events.byStatus.PUBLISHED >= 1);
  });

  it('returns inquiry counts and supports date filtering', async () => {
    const all = await request(app)
      .get('/api/v1/admin/dashboard/inquiry-statistics')
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(all.status, 200);
    assert.ok(all.body.data.statistics.contactMessages.total >= 2);
    assert.ok(all.body.data.statistics.contactMessages.byStatus.NEW >= 1);
    assert.ok(all.body.data.statistics.admissionInquiries.byStatus.NEW >= 1);
    assert.ok(!JSON.stringify(all.body).includes('Private message body'));
    assert.ok(!JSON.stringify(all.body).includes('Private admissions message'));

    const futureFrom = new Date(Date.now() + 86400000).toISOString();
    const futureTo = new Date(Date.now() + 2 * 86400000).toISOString();
    const emptyRange = await request(app)
      .get('/api/v1/admin/dashboard/inquiry-statistics')
      .query({ from: futureFrom, to: futureTo })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(emptyRange.status, 200);
    assert.equal(emptyRange.body.data.statistics.contactMessages.total, 0);
    assert.equal(emptyRange.body.data.statistics.admissionInquiries.total, 0);
  });

  it('rejects invalid date ranges', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/inquiry-statistics')
      .query({
        from: '2026-12-31T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 422);
  });

  it('rejects invalid date formats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/inquiry-statistics')
      .query({ from: 'not-a-date' })
      .set('Authorization', `Bearer ${superToken}`);
    assert.equal(res.status, 422);
  });

  it('returns recent activity ordered and paginated without sensitive metadata', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/recent-activity')
      .query({ page: 1, limit: 5 })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.limit, 5);
    assert.ok(res.body.data.items.length <= 5);

    if (res.body.data.items.length >= 2) {
      const first = new Date(res.body.data.items[0].createdAt).getTime();
      const second = new Date(res.body.data.items[1].createdAt).getTime();
      assert.ok(first >= second);
    }

    const phase14Item = res.body.data.items.find(
      (item) => item.entityType === 'Page' && item.action === 'pages.publish'
    );
    if (phase14Item) {
      assert.equal(phase14Item.metadata.slug, 'phase14-published');
      assert.equal(phase14Item.metadata.secretToken, undefined);
      assert.equal(phase14Item.metadata.message, undefined);
      assert.ok(phase14Item.admin);
      assert.equal(phase14Item.admin.email, emails.super);
    }

    assert.ok(!JSON.stringify(res.body).includes('should-not-leak'));
    assert.ok(!JSON.stringify(res.body).includes('full private body'));
  });

  it('sanitizes audit metadata defensively', () => {
    const sanitized = sanitizeAuditMetadata({
      slug: 'ok',
      secretToken: 'no',
      fields: ['title'],
      nested: { bad: true },
    });
    assert.deepEqual(sanitized, { slug: 'ok', fields: ['title'] });
  });

  it('handles empty-range style zero counts without errors', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/inquiry-statistics')
      .query({
        from: '2099-01-01T00:00:00.000Z',
        to: '2099-01-02T00:00:00.000Z',
      })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.statistics.contactMessages.total, 0);
    assert.deepEqual(res.body.data.statistics.contactMessages.byStatus, {});
  });

  it('surfaces validation errors instead of leaking database internals', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/recent-activity')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(!JSON.stringify(res.body).toLowerCase().includes('prisma'));
  });
});
