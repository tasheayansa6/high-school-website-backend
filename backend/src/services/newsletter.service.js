const { prisma } = require('../config/database');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const { generateSecureToken, hashToken } = require('../utils/secureToken');
const { recordAudit } = require('./audit.service');
const {
  sendNewsletterConfirmationEmail,
  sendNewsletterWelcomeEmail,
} = require('./email.service');

const STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
});

const GENERIC_SUBSCRIBE_MESSAGE =
  'If this email can receive messages, a confirmation link has been sent.';

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toAdminSubscriber(subscriber) {
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    confirmedAt: subscriber.confirmedAt,
    unsubscribedAt: subscriber.unsubscribedAt,
    deletedAt: subscriber.deletedAt,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}

function confirmationExpiryDate() {
  const expires = new Date();
  expires.setHours(expires.getHours() + env.newsletter.confirmationTokenTtlHours);
  return expires;
}

function buildConfirmUrl(rawToken) {
  // Point at the public site so the confirmation landing page can call the API.
  const base = env.newsletter.frontendPublicUrl.replace(/\/$/, '');
  return `${base}/newsletter/confirm?token=${encodeURIComponent(rawToken)}`;
}

function buildUnsubscribeUrl(rawToken) {
  const base = env.newsletter.frontendPublicUrl.replace(/\/$/, '');
  return `${base}/newsletter/unsubscribe?token=${encodeURIComponent(rawToken)}`;
}

async function issueConfirmationChallenge(subscriberId) {
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = confirmationExpiryDate();

  await prisma.newsletterSubscriber.update({
    where: { id: subscriberId },
    data: {
      status: STATUS.PENDING,
      confirmationTokenHash: tokenHash,
      confirmationTokenExpiresAt: expiresAt,
      confirmedAt: null,
      unsubscribedAt: null,
      deletedAt: null,
    },
  });

  return { rawToken, expiresAt };
}

async function subscribe(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: normalizedEmail },
  });

  // Already active and not soft-deleted: do not reveal status.
  if (existing && !existing.deletedAt && existing.status === STATUS.ACTIVE) {
    return { message: GENERIC_SUBSCRIBE_MESSAGE };
  }

  let subscriberId;

  if (!existing) {
    try {
      const created = await prisma.newsletterSubscriber.create({
        data: {
          email: normalizedEmail,
          status: STATUS.PENDING,
        },
      });
      subscriberId = created.id;
    } catch (error) {
      // Concurrent subscribe race: another request created the row first.
      if (error && error.code === 'P2002') {
        const raced = await prisma.newsletterSubscriber.findUnique({
          where: { email: normalizedEmail },
        });

        if (raced && !raced.deletedAt && raced.status === STATUS.ACTIVE) {
          return { message: GENERIC_SUBSCRIBE_MESSAGE };
        }

        if (!raced) {
          throw error;
        }

        subscriberId = raced.id;
      } else {
        throw error;
      }
    }
  } else {
    subscriberId = existing.id;
  }

  const { rawToken } = await issueConfirmationChallenge(subscriberId);
  const confirmUrl = buildConfirmUrl(rawToken);

  try {
    await sendNewsletterConfirmationEmail({
      to: normalizedEmail,
      confirmUrl,
    });
  } catch (error) {
    // Keep subscriber PENDING; do not claim email was sent.
    throw error;
  }

  return { message: GENERIC_SUBSCRIBE_MESSAGE };
}

async function confirmSubscription(rawToken) {
  if (!rawToken || !String(rawToken).trim()) {
    throw new AppError('Confirmation token is required.', 400, {
      code: 'CONFIRMATION_TOKEN_REQUIRED',
    });
  }

  const tokenHash = hashToken(rawToken);

  const result = await prisma.$transaction(async (tx) => {
    const subscriber = await tx.newsletterSubscriber.findFirst({
      where: notDeleted({
        confirmationTokenHash: tokenHash,
        status: STATUS.PENDING,
      }),
    });

    if (!subscriber) {
      throw new AppError('Confirmation token is invalid or has already been used.', 400, {
        code: 'CONFIRMATION_TOKEN_INVALID',
      });
    }

    if (
      !subscriber.confirmationTokenExpiresAt ||
      subscriber.confirmationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError('Confirmation token has expired.', 400, {
        code: 'CONFIRMATION_TOKEN_EXPIRED',
      });
    }

    const unsubscribeRaw = generateSecureToken();
    const unsubscribeHash = hashToken(unsubscribeRaw);

    const updated = await tx.newsletterSubscriber.updateMany({
      where: {
        id: subscriber.id,
        confirmationTokenHash: tokenHash,
        status: STATUS.PENDING,
      },
      data: {
        status: STATUS.ACTIVE,
        confirmedAt: new Date(),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
        unsubscribeTokenHash: unsubscribeHash,
        unsubscribedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new AppError('Confirmation token is invalid or has already been used.', 400, {
        code: 'CONFIRMATION_TOKEN_INVALID',
      });
    }

    return { email: subscriber.email, unsubscribeRaw };
  });

  try {
    await sendNewsletterWelcomeEmail({
      to: result.email,
      unsubscribeUrl: buildUnsubscribeUrl(result.unsubscribeRaw),
    });
  } catch (_error) {
    // Subscription is already active; welcome email failure should not roll back confirmation.
  }

  return {
    message: 'Subscription confirmed successfully.',
  };
}

async function unsubscribe(rawToken) {
  if (!rawToken || !String(rawToken).trim()) {
    throw new AppError('Unsubscribe token is required.', 400, {
      code: 'UNSUBSCRIBE_TOKEN_REQUIRED',
    });
  }

  const tokenHash = hashToken(rawToken);

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: notDeleted({
      unsubscribeTokenHash: tokenHash,
    }),
  });

  if (!subscriber) {
    // Generic response to avoid token probing details.
    return { message: 'If the subscription exists, it has been unsubscribed.' };
  }

  if (subscriber.status === STATUS.UNSUBSCRIBED) {
    return { message: 'If the subscription exists, it has been unsubscribed.' };
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: STATUS.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
    },
  });

  return { message: 'If the subscription exists, it has been unsubscribed.' };
}

async function listSubscribers({
  page = 1,
  limit = 20,
  q,
  status,
  sortOrder = 'desc',
  includeDeleted = false,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (status) {
    where.status = status;
  }

  if (q) {
    where.email = { contains: q };
  }

  const [total, items] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toAdminSubscriber),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function findSubscriberOrThrow(id, { includeDeleted = false } = {}) {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
  });

  if (!subscriber) {
    throw new AppError('Subscriber not found.', 404, {
      code: 'SUBSCRIBER_NOT_FOUND',
    });
  }

  return subscriber;
}

async function getSubscriberById(id) {
  const subscriber = await findSubscriberOrThrow(id);
  return toAdminSubscriber(subscriber);
}

async function updateSubscriberStatus(id, status, admin, requestMeta = {}) {
  if (!Object.values(STATUS).includes(status)) {
    throw new AppError('Invalid subscriber status.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'status', message: 'status is not supported' }],
    });
  }

  const existing = await findSubscriberOrThrow(id);

  const subscriber = await prisma.$transaction(async (tx) => {
    const data = { status };

    if (status === STATUS.ACTIVE) {
      data.confirmedAt = existing.confirmedAt || new Date();
      data.unsubscribedAt = null;
    }

    if (status === STATUS.UNSUBSCRIBED) {
      data.unsubscribedAt = new Date();
    }

    if (status === STATUS.PENDING) {
      data.confirmedAt = null;
      data.unsubscribedAt = null;
    }

    const updated = await tx.newsletterSubscriber.update({
      where: { id: existing.id },
      data,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'newsletter.status_update',
      entityType: 'NewsletterSubscriber',
      entityId: updated.id,
      metadata: { from: existing.status, to: status },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminSubscriber(subscriber);
}

async function softDeleteSubscriber(id, admin, requestMeta = {}) {
  const existing = await findSubscriberOrThrow(id);

  const subscriber = await prisma.$transaction(async (tx) => {
    const updated = await tx.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        status: STATUS.UNSUBSCRIBED,
        unsubscribedAt: existing.unsubscribedAt || new Date(),
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'newsletter.delete',
      entityType: 'NewsletterSubscriber',
      entityId: updated.id,
      metadata: { previousStatus: existing.status },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminSubscriber(subscriber);
}

async function restoreSubscriber(id, admin, requestMeta = {}) {
  const existing = await findSubscriberOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Subscriber is not deleted.', 400, {
      code: 'SUBSCRIBER_NOT_DELETED',
    });
  }

  const subscriber = await prisma.$transaction(async (tx) => {
    const updated = await tx.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        status: STATUS.UNSUBSCRIBED,
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'newsletter.restore',
      entityType: 'NewsletterSubscriber',
      entityId: updated.id,
      metadata: {},
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminSubscriber(subscriber);
}

module.exports = {
  STATUS,
  subscribe,
  confirmSubscription,
  unsubscribe,
  listSubscribers,
  getSubscriberById,
  updateSubscriberStatus,
  softDeleteSubscriber,
  restoreSubscriber,
  toAdminSubscriber,
};
