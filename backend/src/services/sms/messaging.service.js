/**
 * Direct messaging: 1:1 conversations among Admin, Teacher, and Student
 * with strict eligibility checks.
 */
const { prisma } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  validationFailure,
  conflict,
  getIp,
  isUniqueViolation,
} = require('./common');

const MESSAGE_MAX = 2000;
const CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND';
const MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND';

const ACTOR = Object.freeze({
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
});

function scopeKey(type, id) {
  return `${type}:${id}`;
}

function actorFields(type, id) {
  if (type === ACTOR.ADMIN) {
    return { participantType: ACTOR.ADMIN, adminId: id, teacherId: null, studentId: null };
  }
  if (type === ACTOR.TEACHER) {
    return { participantType: ACTOR.TEACHER, adminId: null, teacherId: id, studentId: null };
  }
  return { participantType: ACTOR.STUDENT, adminId: null, teacherId: null, studentId: id };
}

function senderFields(type, id) {
  if (type === ACTOR.ADMIN) {
    return { senderType: ACTOR.ADMIN, adminId: id, teacherId: null, studentId: null };
  }
  if (type === ACTOR.TEACHER) {
    return { senderType: ACTOR.TEACHER, adminId: null, teacherId: id, studentId: null };
  }
  return { senderType: ACTOR.STUDENT, adminId: null, teacherId: null, studentId: id };
}

function pairKeyFor(aType, aId, bType, bId) {
  const left = scopeKey(aType, aId);
  const right = scopeKey(bType, bId);
  return [left, right].sort().join('|');
}

function auditActor(actor) {
  if (actor.type === ACTOR.ADMIN) return { adminId: actor.id };
  if (actor.type === ACTOR.TEACHER) return { teacherId: actor.id };
  return { studentId: actor.id };
}

function toPublicPerson(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    ...(row.email != null ? { email: row.email } : {}),
    ...(row.employeeCode != null ? { employeeCode: row.employeeCode } : {}),
    ...(row.studentCode != null ? { studentCode: row.studentCode } : {}),
  };
}

function toParticipant(p) {
  return {
    id: p.id,
    participantType: p.participantType,
    adminId: p.adminId,
    teacherId: p.teacherId,
    studentId: p.studentId,
    lastReadAt: p.lastReadAt,
    person:
      p.participantType === ACTOR.ADMIN
        ? toPublicPerson(p.admin)
        : p.participantType === ACTOR.TEACHER
          ? toPublicPerson(p.teacher)
          : toPublicPerson(p.student),
  };
}

function toMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderType: row.senderType,
    adminId: row.adminId,
    teacherId: row.teacherId,
    studentId: row.studentId,
    body: row.body,
    createdAt: row.createdAt,
    sender:
      row.senderType === ACTOR.ADMIN
        ? toPublicPerson(row.admin)
        : row.senderType === ACTOR.TEACHER
          ? toPublicPerson(row.teacher)
          : toPublicPerson(row.student),
  };
}

const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
};

/** Admins exposed as messaging contacts include email so staff can identify them. */
const adminPersonSelect = { ...personSelect, email: true };
const teacherPersonSelect = { ...personSelect, employeeCode: true };
const studentPersonSelect = { ...personSelect, studentCode: true };

const participantInclude = {
  admin: { select: adminPersonSelect },
  teacher: { select: teacherPersonSelect },
  student: { select: studentPersonSelect },
};

const messageInclude = {
  admin: { select: adminPersonSelect },
  teacher: { select: teacherPersonSelect },
  student: { select: studentPersonSelect },
};

async function assertActiveActor(type, id) {
  if (type === ACTOR.ADMIN) {
    const row = await prisma.admin.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: personSelect,
    });
    if (!row) throw notFound('Admin', 'ADMIN_NOT_FOUND');
    return row;
  }
  if (type === ACTOR.TEACHER) {
    const row = await prisma.teacher.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: teacherPersonSelect,
    });
    if (!row) throw notFound('Teacher', 'TEACHER_NOT_FOUND');
    return row;
  }
  const row = await prisma.student.findFirst({
    where: { id, deletedAt: null, isActive: true },
    select: studentPersonSelect,
  });
  if (!row) throw notFound('Student', 'STUDENT_NOT_FOUND');
  return row;
}

/**
 * Returns true when actor may start/continue a conversation with peer.
 */
async function canMessage(actorType, actorId, peerType, peerId) {
  if (actorType === peerType && actorId === peerId) return false;
  // No student↔student
  if (actorType === ACTOR.STUDENT && peerType === ACTOR.STUDENT) return false;
  // No teacher↔teacher (out of scope)
  if (actorType === ACTOR.TEACHER && peerType === ACTOR.TEACHER) return false;

  if (actorType === ACTOR.ADMIN) {
    return peerType === ACTOR.TEACHER || peerType === ACTOR.STUDENT;
  }

  if (peerType === ACTOR.ADMIN) {
    return actorType === ACTOR.TEACHER || actorType === ACTOR.STUDENT;
  }

  // Teacher ↔ Student: must share a class via teaching assignment + active enrollment
  if (
    (actorType === ACTOR.TEACHER && peerType === ACTOR.STUDENT) ||
    (actorType === ACTOR.STUDENT && peerType === ACTOR.TEACHER)
  ) {
    const teacherId = actorType === ACTOR.TEACHER ? actorId : peerId;
    const studentId = actorType === ACTOR.STUDENT ? actorId : peerId;
    const assignment = await prisma.teachingAssignment.findFirst({
      where: {
        teacherId,
        deletedAt: null,
        teacher: { deletedAt: null, isActive: true },
        classOffering: {
          deletedAt: null,
          enrollments: {
            some: {
              studentId,
              status: 'ACTIVE',
              deletedAt: null,
              student: { deletedAt: null, isActive: true },
            },
          },
        },
      },
      select: { id: true },
    });
    return Boolean(assignment);
  }

  return false;
}

async function assertCanMessage(actor, peerType, peerId) {
  await assertActiveActor(peerType, peerId);
  const allowed = await canMessage(actor.type, actor.id, peerType, peerId);
  if (!allowed) {
    throw new AppError('You are not allowed to message this user.', 403, {
      code: 'MESSAGING_FORBIDDEN',
    });
  }
}

async function findParticipantOrThrow(conversationId, actor) {
  const scope = scopeKey(actor.type, actor.id);
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, participantScopeKey: scope },
    include: participantInclude,
  });
  if (!participant) throw notFound('Conversation', CONVERSATION_NOT_FOUND);
  return participant;
}

async function getConversationOwned(conversationId, actor) {
  await findParticipantOrThrow(conversationId, actor);
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: participantInclude },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: messageInclude,
      },
    },
  });
  if (!conversation) throw notFound('Conversation', CONVERSATION_NOT_FOUND);
  return conversation;
}

async function unreadCountForParticipant(conversationId, scope, lastReadAt) {
  return prisma.message.count({
    where: {
      conversationId,
      senderScopeKey: { not: scope },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

async function toConversationSummary(conversation, actor) {
  const scope = scopeKey(actor.type, actor.id);
  const me = conversation.participants.find((p) => p.participantScopeKey === scope);
  const other = conversation.participants.find((p) => p.participantScopeKey !== scope);
  const lastMessage = conversation.messages?.[0] || null;
  const unreadCount = await unreadCountForParticipant(
    conversation.id,
    scope,
    me?.lastReadAt || null
  );
  return {
    id: conversation.id,
    pairKey: conversation.pairKey,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    unreadCount,
    otherParticipant: other ? toParticipant(other) : null,
    lastMessage: lastMessage ? toMessage(lastMessage) : null,
  };
}

async function listConversations(actor, { page = 1, limit = 20 } = {}) {
  const scope = scopeKey(actor.type, actor.id);
  const where = {
    participants: { some: { participantScopeKey: scope } },
  };
  const [total, rows] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        participants: { include: participantInclude },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: messageInclude,
        },
      },
    }),
  ]);

  const items = [];
  for (const row of rows) {
    items.push(await toConversationSummary(row, actor));
  }

  return { items, pagination: buildPagination({ page, limit, total }) };
}

async function getConversation(actor, conversationId) {
  const conversation = await getConversationOwned(conversationId, actor);
  return toConversationSummary(conversation, actor);
}

async function listEligibleContacts(actor, { q } = {}) {
  const query = typeof q === 'string' ? q.trim() : '';
  const items = [];

  if (actor.type === ACTOR.ADMIN) {
    const [teachers, students] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { email: { contains: query } },
                  { employeeCode: { contains: query } },
                ],
              }
            : {}),
        },
        take: 50,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: teacherPersonSelect,
      }),
      prisma.student.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { studentCode: { contains: query } },
                ],
              }
            : {}),
        },
        take: 50,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: studentPersonSelect,
      }),
    ]);
    for (const t of teachers) {
      items.push({ type: ACTOR.TEACHER, ...toPublicPerson(t) });
    }
    for (const s of students) {
      items.push({ type: ACTOR.STUDENT, ...toPublicPerson(s) });
    }
    return { items };
  }

  if (actor.type === ACTOR.TEACHER) {
    const admins = await prisma.admin.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query } },
                { lastName: { contains: query } },
                { email: { contains: query } },
              ],
            }
          : {}),
      },
      take: 30,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: adminPersonSelect,
    });
    for (const a of admins) {
      items.push({ type: ACTOR.ADMIN, ...toPublicPerson(a) });
    }

    const classIds = (
      await prisma.teachingAssignment.findMany({
        where: { teacherId: actor.id, deletedAt: null },
        select: { classOfferingId: true },
      })
    ).map((r) => r.classOfferingId);

    if (classIds.length) {
      const students = await prisma.student.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          enrollments: {
            some: {
              classOfferingId: { in: classIds },
              status: 'ACTIVE',
              deletedAt: null,
            },
          },
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { studentCode: { contains: query } },
                ],
              }
            : {}),
        },
        take: 50,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: studentPersonSelect,
      });
      for (const s of students) {
        items.push({ type: ACTOR.STUDENT, ...toPublicPerson(s) });
      }
    }
    return { items };
  }

  // Student
  const admins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    take: 30,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: adminPersonSelect,
  });
  for (const a of admins) {
    items.push({ type: ACTOR.ADMIN, ...toPublicPerson(a) });
  }

  const classIds = (
    await prisma.enrollment.findMany({
      where: { studentId: actor.id, status: 'ACTIVE', deletedAt: null },
      select: { classOfferingId: true },
    })
  ).map((r) => r.classOfferingId);

  if (classIds.length) {
    const teachers = await prisma.teacher.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        teachingAssignments: {
          some: {
            classOfferingId: { in: classIds },
            deletedAt: null,
          },
        },
        ...(query
          ? {
              OR: [
                { firstName: { contains: query } },
                { lastName: { contains: query } },
                { employeeCode: { contains: query } },
              ],
            }
          : {}),
      },
      take: 50,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: teacherPersonSelect,
    });
    for (const t of teachers) {
      items.push({ type: ACTOR.TEACHER, ...toPublicPerson(t) });
    }
  }

  return { items };
}

async function startConversation(actor, { peerType, peerId }, requestMeta = {}) {
  if (!Object.values(ACTOR).includes(peerType)) {
    throw validationFailure('Invalid peer type', 'peerType');
  }
  if (!Number.isInteger(peerId) || peerId <= 0) {
    throw validationFailure('Invalid peer id', 'peerId');
  }

  await assertCanMessage(actor, peerType, peerId);

  const pairKey = pairKeyFor(actor.type, actor.id, peerType, peerId);
  const existing = await prisma.conversation.findUnique({
    where: { pairKey },
    include: {
      participants: { include: participantInclude },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: messageInclude },
    },
  });
  if (existing) {
    return toConversationSummary(existing, actor);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { pairKey },
      });
      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: conversation.id,
            ...actorFields(actor.type, actor.id),
            participantScopeKey: scopeKey(actor.type, actor.id),
          },
          {
            conversationId: conversation.id,
            ...actorFields(peerType, peerId),
            participantScopeKey: scopeKey(peerType, peerId),
          },
        ],
      });
      return conversation;
    });

    await recordAudit({
      ...auditActor(actor),
      action: 'messaging.conversation.start',
      entityType: 'Conversation',
      entityId: created.id,
      ipAddress: getIp(requestMeta),
      metadata: { peerType, peerId },
    });

    return getConversation(actor, created.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await prisma.conversation.findUnique({
        where: { pairKey },
        include: {
          participants: { include: participantInclude },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: messageInclude },
        },
      });
      if (again) return toConversationSummary(again, actor);
    }
    throw error;
  }
}

async function listMessages(actor, conversationId, { page = 1, limit = 30 } = {}) {
  await findParticipantOrThrow(conversationId, actor);
  const where = { conversationId };
  const [total, rows] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: messageInclude,
    }),
  ]);

  // Return chronological for UI (oldest → newest within page)
  const items = rows.reverse().map(toMessage);
  return { items, pagination: buildPagination({ page, limit, total }) };
}

async function sendMessage(actor, conversationId, { body }, requestMeta = {}) {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) throw validationFailure('Message cannot be empty', 'body');
  if (text.length > MESSAGE_MAX) {
    throw validationFailure(`Message must be at most ${MESSAGE_MAX} characters`, 'body');
  }

  const me = await findParticipantOrThrow(conversationId, actor);
  const peers = await prisma.conversationParticipant.findMany({
    where: { conversationId, participantScopeKey: { not: me.participantScopeKey } },
  });
  if (peers.length !== 1) {
    throw conflict('Conversation participants are invalid', 'CONVERSATION_INVALID');
  }
  const peer = peers[0];

  // Re-check eligibility on every send (assignment/enrollment may have changed)
  await assertCanMessage(actor, peer.participantType, peer.adminId || peer.teacherId || peer.studentId);

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        ...senderFields(actor.type, actor.id),
        senderScopeKey: scopeKey(actor.type, actor.id),
        body: text,
      },
      include: messageInclude,
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    await tx.conversationParticipant.update({
      where: { id: me.id },
      data: { lastReadAt: message.createdAt },
    });
    return message;
  });

  await recordAudit({
    ...auditActor(actor),
    action: 'messaging.message.send',
    entityType: 'Message',
    entityId: created.id,
    ipAddress: getIp(requestMeta),
    metadata: { conversationId },
  });

  // Post-commit notification (never rolls back the message)
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyDirectMessageReceived({
    message: created,
    recipientType: peer.participantType,
    recipientId: peer.adminId || peer.teacherId || peer.studentId,
  });

  return toMessage(created);
}

async function markConversationRead(actor, conversationId) {
  const me = await findParticipantOrThrow(conversationId, actor);
  const now = new Date();
  await prisma.conversationParticipant.update({
    where: { id: me.id },
    data: { lastReadAt: now },
  });
  return { conversationId, lastReadAt: now };
}

async function unreadTotal(actor) {
  const scope = scopeKey(actor.type, actor.id);
  const memberships = await prisma.conversationParticipant.findMany({
    where: { participantScopeKey: scope },
    select: { conversationId: true, lastReadAt: true },
  });

  let unreadCount = 0;
  for (const m of memberships) {
    unreadCount += await unreadCountForParticipant(m.conversationId, scope, m.lastReadAt);
  }
  return { unreadCount };
}

module.exports = {
  ACTOR,
  MESSAGE_MAX,
  scopeKey,
  canMessage,
  listConversations,
  getConversation,
  listEligibleContacts,
  startConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  unreadTotal,
};
