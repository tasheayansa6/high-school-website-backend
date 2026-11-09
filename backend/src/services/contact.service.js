const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./audit.service');

const CONTACT_STATUS = Object.freeze({
  NEW: 'NEW',
  READ: 'READ',
  REPLIED: 'REPLIED',
  ARCHIVED: 'ARCHIVED',
});

const VALID_STATUSES = Object.freeze(Object.values(CONTACT_STATUS));

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toPublicSubmissionReceipt(message) {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    subject: message.subject,
    createdAt: message.createdAt,
  };
}

function toAdminMessage(message) {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone,
    subject: message.subject,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    handledById: message.handledById,
    handledBy: message.handledBy
      ? {
          id: message.handledBy.id,
          firstName: message.handledBy.firstName,
          lastName: message.handledBy.lastName,
          email: message.handledBy.email,
        }
      : null,
  };
}

const handledByInclude = {
  handledBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

async function createMessage(payload) {
  const message = await prisma.contactMessage.create({
    data: {
      name: payload.name.trim(),
      email: payload.email.toLowerCase(),
      phone: payload.phone || null,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      status: CONTACT_STATUS.NEW,
    },
  });

  return toPublicSubmissionReceipt(message);
}

async function listMessages({
  page = 1,
  limit = 20,
  q,
  status,
  sortOrder = 'desc',
  includeArchived = false,
} = {}) {
  const where = {};

  if (status) {
    where.status = status;
  } else if (!includeArchived) {
    where.status = { not: CONTACT_STATUS.ARCHIVED };
  }

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { subject: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: handledByInclude,
    }),
  ]);

  return {
    items: items.map(toAdminMessage),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function findMessageOrThrow(id, { includeArchived = true } = {}) {
  const message = await prisma.contactMessage.findFirst({
    where: {
      id,
      ...(includeArchived ? {} : { status: { not: CONTACT_STATUS.ARCHIVED } }),
    },
    include: handledByInclude,
  });

  if (!message) {
    throw new AppError('Contact message not found.', 404, {
      code: 'CONTACT_MESSAGE_NOT_FOUND',
    });
  }

  return message;
}

async function getMessageById(id) {
  // Ordinary detail view excludes archived messages.
  const message = await findMessageOrThrow(id, { includeArchived: false });
  return toAdminMessage(message);
}

async function updateStatus(id, status, admin, requestMeta = {}) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid contact message status.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'status', message: 'status is not supported' }],
    });
  }

  const existing = await findMessageOrThrow(id, { includeArchived: true });

  if (existing.status === CONTACT_STATUS.ARCHIVED && status !== CONTACT_STATUS.ARCHIVED) {
    throw new AppError(
      'Archived messages must be restored before changing status.',
      400,
      { code: 'CONTACT_MESSAGE_ARCHIVED' }
    );
  }

  const message = await prisma.$transaction(async (tx) => {
    const updated = await tx.contactMessage.update({
      where: { id: existing.id },
      data: {
        status,
        handledById: admin.id,
      },
      include: handledByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'contact.status_update',
      entityType: 'ContactMessage',
      entityId: updated.id,
      metadata: {
        from: existing.status,
        to: status,
        subject: updated.subject,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMessage(message);
}

/**
 * ContactMessage has no deletedAt column. "Delete" archives the message
 * (status ARCHIVED) so it remains recoverable without a schema migration.
 */
async function archiveMessage(id, admin, requestMeta = {}) {
  const existing = await findMessageOrThrow(id, { includeArchived: false });

  const message = await prisma.$transaction(async (tx) => {
    const updated = await tx.contactMessage.update({
      where: { id: existing.id },
      data: {
        status: CONTACT_STATUS.ARCHIVED,
        handledById: admin.id,
      },
      include: handledByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'contact.delete',
      entityType: 'ContactMessage',
      entityId: updated.id,
      metadata: {
        subject: updated.subject,
        previousStatus: existing.status,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMessage(message);
}

async function restoreMessage(id, admin, requestMeta = {}) {
  const existing = await findMessageOrThrow(id, { includeArchived: true });

  if (existing.status !== CONTACT_STATUS.ARCHIVED) {
    throw new AppError('Contact message is not archived.', 400, {
      code: 'CONTACT_MESSAGE_NOT_ARCHIVED',
    });
  }

  const message = await prisma.$transaction(async (tx) => {
    const updated = await tx.contactMessage.update({
      where: { id: existing.id },
      data: {
        status: CONTACT_STATUS.NEW,
        handledById: admin.id,
      },
      include: handledByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'contact.restore',
      entityType: 'ContactMessage',
      entityId: updated.id,
      metadata: { subject: updated.subject },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMessage(message);
}

module.exports = {
  CONTACT_STATUS,
  VALID_STATUSES,
  createMessage,
  listMessages,
  getMessageById,
  updateStatus,
  archiveMessage,
  restoreMessage,
};
