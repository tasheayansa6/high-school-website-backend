const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
process.env.NEWSLETTER_RATE_LIMIT_MAX = process.env.NEWSLETTER_RATE_LIMIT_MAX || '1000';
process.env.EMAIL_TRANSPORT = 'json';

const app = require('../src/app');
const { prisma, connectDatabase, disconnectDatabase } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { DEFAULT_ROLES, ROLE_SLUGS } = require('../src/config/roles');
const { hashToken } = require('../src/utils/secureToken');
const {
  resetEmailTransportForTests,
  getJsonTransportOutbox,
  setForceEmailFailureForTests,
} = require('../src/services/email.service');

const PASSWORD = 'Phase9TestPass1';
const emails = {
  super: 'phase9.super@example.com',
  editor: 'phase9.editor@example.com',
  communicator: 'phase9.comms@example.com',
};

const subscriberEmails = {
  primary: 'phase9.subscriber@example.com',
  duplicate: 'phase9.duplicate@example.com',
  search: 'phase9.searchable@example.com',
  fail: 'phase9.fail@example.com',
  concurrent: 'phase9.concurrent@example.com',
  expire: 'phase9.expire@example.com',
  unsub: 'phase9.unsub@example.com',
};

const createdSubscriberIds = [];

function extractTokenFromText(text) {
  const match = String(text).match(/[?&]token=([A-Za-z0-9_-]+)/);
  assert.ok(match, 'expected token in email body');
  return decodeURIComponent(match[1]);
}

function latestMail(subjectIncludes) {
  const outbox = getJsonTransportOutbox();
  const matches = outbox.filter((item) => item.subject.includes(subjectIncludes));
  assert.ok(matches.length >= 1, `expected email with subject containing "${subjectIncludes}"`);
  return matches[matches.length - 1];
}

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
        firstName: 'Phase9',
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
      firstName: 'Phase9',
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
  const allEmails = Object.values(subscriberEmails);

  const existing = await prisma.newsletterSubscriber.findMany({
    where: { email: { in: allEmails } },
    select: { id: true },
  });
  const ids = [
    ...new Set([...createdSubscriberIds, ...existing.map((row) => row.id)]),
  ];

  if (ids.length) {
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: { in: ids.map(String) },
      },
    });
    await prisma.newsletterSubscriber.deleteMany({
      where: { id: { in: ids } },
    });
  }

  await prisma.admin.deleteMany({
    where: { email: { in: Object.values(emails) } },
  });

  createdSubscriberIds.length = 0;
  resetEmailTransportForTests();
}

describe('Phase 9 newsletter module', () => {
  let superToken;
  let editorToken;
  let communicatorToken;
  let primaryId;
  let confirmToken;
  let unsubscribeToken;

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

  it('accepts a valid subscription request', async () => {
    const res = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.primary });

    assert.equal(res.status, 202);
    assert.equal(res.body.success, true);
    assert.match(res.body.message, /confirmation/i);

    const saved = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.primary },
    });
    assert.ok(saved);
    assert.equal(saved.status, 'PENDING');
    assert.ok(saved.confirmationTokenHash);
    assert.ok(saved.confirmationTokenExpiresAt);
    assert.equal(saved.confirmedAt, null);
    primaryId = saved.id;
    createdSubscriberIds.push(primaryId);
  });

  it('sends a confirmation email and keeps subscriber unconfirmed', async () => {
    const mail = latestMail('Confirm your newsletter subscription');
    assert.equal(mail.to, subscriberEmails.primary);
    confirmToken = extractTokenFromText(mail.text);
    assert.equal(hashToken(confirmToken), (
      await prisma.newsletterSubscriber.findUnique({ where: { id: primaryId } })
    ).confirmationTokenHash);

    const saved = await prisma.newsletterSubscriber.findUnique({ where: { id: primaryId } });
    assert.equal(saved.status, 'PENDING');
    assert.equal(saved.confirmedAt, null);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'not-an-email' });
    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects missing email', async () => {
    const res = await request(app).post('/api/v1/newsletter/subscribe').send({});
    assert.equal(res.status, 422);
  });

  it('handles email delivery failure without activating', async () => {
    setForceEmailFailureForTests(true);
    const res = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.fail });
    setForceEmailFailureForTests(false);

    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'EMAIL_DELIVERY_FAILED');

    const saved = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.fail },
    });
    assert.ok(saved);
    assert.equal(saved.status, 'PENDING');
    assert.equal(saved.confirmedAt, null);
    createdSubscriberIds.push(saved.id);
  });

  it('confirms a valid token and activates the subscriber', async () => {
    const res = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token: confirmToken });

    assert.equal(res.status, 200);
    assert.match(res.body.message, /confirmed/i);

    const saved = await prisma.newsletterSubscriber.findUnique({ where: { id: primaryId } });
    assert.equal(saved.status, 'ACTIVE');
    assert.ok(saved.confirmedAt);
    assert.equal(saved.confirmationTokenHash, null);
    assert.ok(saved.unsubscribeTokenHash);

    const welcome = latestMail('Subscription confirmed');
    unsubscribeToken = extractTokenFromText(welcome.text);
    assert.equal(hashToken(unsubscribeToken), saved.unsubscribeTokenHash);
  });

  it('rejects reused confirmation tokens', async () => {
    const res = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token: confirmToken });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CONFIRMATION_TOKEN_INVALID');
  });

  it('rejects invalid confirmation tokens', async () => {
    const res = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token: 'definitely-not-a-real-token' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CONFIRMATION_TOKEN_INVALID');
  });

  it('rejects expired confirmation tokens', async () => {
    const subscribeRes = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.expire });
    assert.equal(subscribeRes.status, 202);

    const saved = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.expire },
    });
    createdSubscriberIds.push(saved.id);

    const mail = latestMail('Confirm your newsletter subscription');
    const token = extractTokenFromText(mail.text);

    await prisma.newsletterSubscriber.update({
      where: { id: saved.id },
      data: { confirmationTokenExpiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CONFIRMATION_TOKEN_EXPIRED');
  });

  it('prevents duplicate active subscriptions from revealing status', async () => {
    const first = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.duplicate });
    assert.equal(first.status, 202);

    const pending = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.duplicate },
    });
    createdSubscriberIds.push(pending.id);

    const mail = latestMail('Confirm your newsletter subscription');
    const token = extractTokenFromText(mail.text);
    const confirmRes = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token });
    assert.equal(confirmRes.status, 200);

    const outboxBefore = getJsonTransportOutbox().length;
    const second = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.duplicate });
    assert.equal(second.status, 202);
    assert.equal(getJsonTransportOutbox().length, outboxBefore);

    const count = await prisma.newsletterSubscriber.count({
      where: { email: subscriberEmails.duplicate },
    });
    assert.equal(count, 1);
  });

  it('handles concurrent confirmation attempts safely', async () => {
    const subscribeRes = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.concurrent });
    assert.equal(subscribeRes.status, 202);

    const saved = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.concurrent },
    });
    createdSubscriberIds.push(saved.id);

    const mail = latestMail('Confirm your newsletter subscription');
    const token = extractTokenFromText(mail.text);

    const [a, b] = await Promise.all([
      request(app).get('/api/v1/newsletter/confirm').query({ token }),
      request(app).get('/api/v1/newsletter/confirm').query({ token }),
    ]);

    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [200, 400]);

    const after = await prisma.newsletterSubscriber.findUnique({ where: { id: saved.id } });
    assert.equal(after.status, 'ACTIVE');
    assert.equal(after.confirmationTokenHash, null);
  });

  it('unsubscribes with a valid token and is idempotent', async () => {
    const first = await request(app)
      .post('/api/v1/newsletter/unsubscribe')
      .send({ token: unsubscribeToken });
    assert.equal(first.status, 200);

    const saved = await prisma.newsletterSubscriber.findUnique({ where: { id: primaryId } });
    assert.equal(saved.status, 'UNSUBSCRIBED');
    assert.ok(saved.unsubscribedAt);

    const second = await request(app)
      .post('/api/v1/newsletter/unsubscribe')
      .send({ token: unsubscribeToken });
    assert.equal(second.status, 200);
    assert.equal(second.body.message, first.body.message);
  });

  it('returns generic success for invalid unsubscribe tokens', async () => {
    const res = await request(app)
      .post('/api/v1/newsletter/unsubscribe')
      .send({ token: 'invalid-unsubscribe-token' });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /unsubscribed/i);
  });

  it('keeps unsubscribed subscribers out of active status', async () => {
    const list = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .query({ status: 'ACTIVE', q: 'phase9.subscriber' })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(list.status, 200);
    assert.equal(
      list.body.data.items.some((item) => item.id === primaryId),
      false
    );
  });

  it('rejects unauthenticated administrator access', async () => {
    const res = await request(app).get('/api/v1/admin/newsletter/subscribers');
    assert.equal(res.status, 401);
  });

  it('denies Content Editor newsletter management', async () => {
    const res = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(res.status, 403);
  });

  it('lists subscribers for Communication Manager with pagination', async () => {
    await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.search });

    const searchable = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.search },
    });
    createdSubscriberIds.push(searchable.id);

    const res = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .query({ page: 1, limit: 2, sortOrder: 'desc' })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.limit, 2);
    assert.ok(res.body.data.items.length <= 2);
    assert.ok(!JSON.stringify(res.body.data.items).includes('TokenHash'));
    assert.ok(!JSON.stringify(res.body.data.items).includes('confirmationToken'));
  });

  it('supports email search and status filtering', async () => {
    const searchRes = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .query({ q: 'phase9.searchable', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.data.items.some((item) => item.email === subscriberEmails.search));

    const filterRes = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .query({ status: 'PENDING', page: 1, limit: 50 })
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.body.data.items.every((item) => item.status === 'PENDING'));
  });

  it('retrieves subscriber details for Super Admin', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/newsletter/subscribers/${primaryId}`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.subscriber.id, primaryId);
    assert.equal(res.body.data.subscriber.email, subscriberEmails.primary);
    assert.equal(res.body.data.subscriber.confirmationTokenHash, undefined);
    assert.equal(res.body.data.subscriber.unsubscribeTokenHash, undefined);
  });

  it('updates subscriber status and records audit', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/newsletter/subscribers/${primaryId}/status`)
      .set('Authorization', `Bearer ${communicatorToken}`)
      .send({ status: 'ACTIVE' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.subscriber.status, 'ACTIVE');

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: String(primaryId),
        action: 'newsletter.status_update',
      },
    });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].metadata.to, 'ACTIVE');
    assert.ok(!JSON.stringify(logs[0]).includes(confirmToken));
    assert.ok(!JSON.stringify(logs[0]).includes(unsubscribeToken));
  });

  it('soft-deletes a subscriber and records audit', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/newsletter/subscribers/${primaryId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.subscriber.deletedAt);
    assert.equal(res.body.data.subscriber.status, 'UNSUBSCRIBED');

    const detail = await request(app)
      .get(`/api/v1/admin/newsletter/subscribers/${primaryId}`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(detail.status, 404);

    const list = await request(app)
      .get('/api/v1/admin/newsletter/subscribers')
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(
      list.body.data.items.some((item) => item.id === primaryId),
      false
    );

    const deleteLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: String(primaryId),
        action: 'newsletter.delete',
      },
    });
    assert.ok(deleteLogs.length >= 1);
  });

  it('rejects restore by Communication Manager', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/newsletter/subscribers/${primaryId}/restore`)
      .set('Authorization', `Bearer ${communicatorToken}`);
    assert.equal(res.status, 403);
  });

  it('restores a soft-deleted subscriber as Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/newsletter/subscribers/${primaryId}/restore`)
      .set('Authorization', `Bearer ${superToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.subscriber.deletedAt, null);
    assert.equal(res.body.data.subscriber.status, 'UNSUBSCRIBED');

    const restoreLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: String(primaryId),
        action: 'newsletter.restore',
      },
    });
    assert.ok(restoreLogs.length >= 1);
  });

  it('keeps status update and audit consistent via transaction', async () => {
    const before = await prisma.newsletterSubscriber.findUnique({ where: { id: primaryId } });
    const auditCountBefore = await prisma.auditLog.count({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: String(primaryId),
        action: 'newsletter.status_update',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/newsletter/subscribers/${primaryId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'PENDING' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.subscriber.status, 'PENDING');
    assert.notEqual(before.status, 'PENDING');

    const auditCountAfter = await prisma.auditLog.count({
      where: {
        entityType: 'NewsletterSubscriber',
        entityId: String(primaryId),
        action: 'newsletter.status_update',
      },
    });
    assert.equal(auditCountAfter, auditCountBefore + 1);
  });

  it('keeps public newsletter endpoints available without admin auth', async () => {
    const subscribe = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: subscriberEmails.unsub });
    assert.equal(subscribe.status, 202);

    const pending = await prisma.newsletterSubscriber.findUnique({
      where: { email: subscriberEmails.unsub },
    });
    createdSubscriberIds.push(pending.id);

    const mail = latestMail('Confirm your newsletter subscription');
    const token = extractTokenFromText(mail.text);

    const confirm = await request(app)
      .get('/api/v1/newsletter/confirm')
      .query({ token });
    assert.equal(confirm.status, 200);

    const welcome = latestMail('Subscription confirmed');
    const unsubToken = extractTokenFromText(welcome.text);

    const unsub = await request(app)
      .post('/api/v1/newsletter/unsubscribe')
      .send({ token: unsubToken });
    assert.equal(unsub.status, 200);
  });
});
