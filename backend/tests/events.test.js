const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');

const PASSWORD = 'Phase11TestPass1';
const emails = {
  super: 'phase11.super@example.com',
  editor: 'phase11.editor@example.com',
  communicator: 'phase11.comms@example.com',
};

const createdEventIds = [];
const createdMediaIds = [];

const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString();
const pastStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const pastEnd = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();

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
        firstName: 'Phase11',
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
      firstName: 'Phase11',
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
  if (createdEventIds.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'Event',
        entityId: { in: createdEventIds.map(String) },
      },
    });
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  }

  await prisma.event.deleteMany({
    where: { slug: { startsWith: 'phase11-' } },
  });

  if (createdMediaIds.length) {
    await prisma.mediaAsset.deleteMany({ where: { id: { in: createdMediaIds } } });
  }

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });

  createdEventIds.length = 0;
  createdMediaIds.length = 0;
}

describe('Phase 11 events module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let eventId;
  let eventSlug;
  let pastEventSlug;

  before(async () => {
    await connectDatabase();
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

  it('rejects unauthenticated administrator access', async () => {
    const res = await request(app).get('/api/v1/admin/events');
    assert.equal(res.status, 401);
  });

  it('denies Communication Manager event management', async () => {
    const res = await request(app)
      .get('/api/v1/admin/events')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('creates an event as Content Editor', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase11 Science Fair',
        slug: 'phase11-science-fair',
        description: 'Annual science exhibition for students.',
        location: 'Main Hall',
        startsAt: futureStart,
        endsAt: futureEnd,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.event.status, 'DRAFT');
    assert.equal(res.body.data.event.slug, 'phase11-science-fair');
    assert.equal(res.body.data.event.publishedAt, null);
    eventId = res.body.data.event.id;
    eventSlug = res.body.data.event.slug;
    createdEventIds.push(eventId);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.create',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ title: 'Incomplete' });
    assert.equal(res.status, 422);
  });

  it('rejects invalid dates', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Bad Date',
        description: 'Invalid start',
        startsAt: 'not-a-date',
      });
    assert.equal(res.status, 422);
  });

  it('rejects endsAt earlier than startsAt', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Bad Range',
        description: 'End before start',
        startsAt: futureStart,
        endsAt: pastStart,
      });
    assert.equal(res.status, 422);
  });

  it('rejects duplicate slug', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Duplicate Slug Event',
        slug: 'phase11-science-fair',
        description: 'Should conflict',
        startsAt: futureStart,
      });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EVENT_SLUG_CONFLICT');
  });

  it('rejects invalid media reference', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Media Missing',
        slug: 'phase11-media-missing',
        description: 'Bad featured image',
        startsAt: futureStart,
        featuredImageId: 999999,
      });
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'MEDIA_NOT_FOUND');
  });

  it('updates an event without changing publication status', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase11 Science Fair Updated',
        location: 'Auditorium',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.status, 'DRAFT');
    assert.equal(res.body.data.event.title, 'Phase11 Science Fair Updated');
    assert.equal(res.body.data.event.location, 'Auditorium');

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.update',
      },
    });
    assert.ok(logs.length >= 1);
    assert.ok(!JSON.stringify(logs[0].metadata).includes('Annual science'));
  });

  it('excludes drafts from public listing', async () => {
    const res = await request(app).get('/api/v1/events');
    assert.equal(res.status, 200);
    assert.equal(
      res.body.data.items.some((item) => item.slug === eventSlug),
      false
    );
  });

  it('returns 404 for unpublished public detail', async () => {
    const res = await request(app).get(`/api/v1/events/${eventSlug}`);
    assert.equal(res.status, 404);
  });

  it('publishes an event as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.status, 'PUBLISHED');
    assert.ok(res.body.data.event.publishedAt);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.publish',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('lists published events publicly with pagination', async () => {
    const pastRes = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Phase11 Past Assembly',
        slug: 'phase11-past-assembly',
        description: 'Already happened.',
        startsAt: pastStart,
        endsAt: pastEnd,
      });
    assert.equal(pastRes.status, 201);
    createdEventIds.push(pastRes.body.data.event.id);
    pastEventSlug = pastRes.body.data.event.slug;

    await request(app)
      .patch(`/api/v1/admin/events/${pastRes.body.data.event.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    const res = await request(app).get('/api/v1/events').query({ page: 1, limit: 10 });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.ok(res.body.data.items.some((item) => item.slug === eventSlug));
    assert.ok(res.body.data.items.every((item) => item.status === undefined));
  });

  it('retrieves published event details publicly', async () => {
    const res = await request(app).get(`/api/v1/events/${eventSlug}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.slug, eventSlug);
    assert.ok(res.body.data.event.description.includes('science exhibition'));
    assert.equal(res.body.data.event.createdBy, undefined);
    assert.equal(res.body.data.event.status, undefined);
  });

  it('supports upcoming and past filtering', async () => {
    const upcoming = await request(app)
      .get('/api/v1/events')
      .query({ timeframe: 'upcoming' });
    assert.equal(upcoming.status, 200);
    assert.ok(upcoming.body.data.items.some((item) => item.slug === eventSlug));
    assert.equal(
      upcoming.body.data.items.some((item) => item.slug === pastEventSlug),
      false
    );

    const past = await request(app).get('/api/v1/events').query({ timeframe: 'past' });
    assert.equal(past.status, 200);
    assert.ok(past.body.data.items.some((item) => item.slug === pastEventSlug));
    assert.equal(
      past.body.data.items.some((item) => item.slug === eventSlug),
      false
    );
  });

  it('supports date-range filtering', async () => {
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .get('/api/v1/events')
      .query({ startsFrom: from, startsTo: to });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.some((item) => item.slug === eventSlug));
    assert.equal(
      res.body.data.items.some((item) => item.slug === pastEventSlug),
      false
    );
  });

  it('lists and searches events for administrators', async () => {
    const list = await request(app)
      .get('/api/v1/admin/events')
      .query({ page: 1, limit: 20, sortBy: 'startsAt', sortOrder: 'asc' })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((item) => item.id === eventId));

    const search = await request(app)
      .get('/api/v1/admin/events')
      .query({ q: 'science-fair' })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(search.status, 200);
    assert.ok(search.body.data.items.some((item) => item.slug === eventSlug));

    const filtered = await request(app)
      .get('/api/v1/admin/events')
      .query({ status: 'PUBLISHED' })
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.data.items.every((item) => item.status === 'PUBLISHED'));
  });

  it('retrieves admin event details', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.id, eventId);
    assert.equal(res.body.data.event.status, 'PUBLISHED');
  });

  it('unpublishes an event and hides it from public endpoints', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/unpublish`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.status, 'DRAFT');

    const publicDetail = await request(app).get(`/api/v1/events/${eventSlug}`);
    assert.equal(publicDetail.status, 404);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.unpublish',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('cancels an event after republishing', async () => {
    await request(app)
      .patch(`/api/v1/admin/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.status, 'CANCELLED');

    const publicDetail = await request(app).get(`/api/v1/events/${eventSlug}`);
    assert.equal(publicDetail.status, 404);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.cancel',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('rejects publishing a cancelled event directly', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'EVENT_CANCELLED');
  });

  it('soft-deletes an event and excludes it from listings', async () => {
    await request(app)
      .patch(`/api/v1/admin/events/${eventId}/unpublish`)
      .set('Authorization', `Bearer ${editorToken}`);

    await request(app)
      .patch(`/api/v1/admin/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    const res = await request(app)
      .delete(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.event.deletedAt);

    const publicList = await request(app).get('/api/v1/events');
    assert.equal(
      publicList.body.data.items.some((item) => item.id === eventId),
      false
    );

    const adminList = await request(app)
      .get('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(
      adminList.body.data.items.some((item) => item.id === eventId),
      false
    );

    const detail = await request(app)
      .get(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(detail.status, 404);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.delete',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('rejects restore by Content Editor', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/restore`)
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores a soft-deleted event as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}/restore`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.deletedAt, null);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.restore',
      },
    });
    assert.ok(logs.length >= 1);
  });

  it('keeps update and audit consistent via transaction', async () => {
    const before = await prisma.event.findUnique({ where: { id: eventId } });
    const auditCountBefore = await prisma.auditLog.count({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.update',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ location: 'Sports Ground' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.event.location, 'Sports Ground');
    assert.notEqual(before.location, 'Sports Ground');

    const auditCountAfter = await prisma.auditLog.count({
      where: {
        entityType: 'Event',
        entityId: String(eventId),
        action: 'events.update',
      },
    });
    assert.equal(auditCountAfter, auditCountBefore + 1);
  });

  it('returns 404 for missing public events', async () => {
    const res = await request(app).get('/api/v1/events/phase11-does-not-exist');
    assert.equal(res.status, 404);
  });
});
