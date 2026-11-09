const { prisma } = require('../../config/database');
const { hashPassword } = require('../../utils/password');
const { toPublicTeacher } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  getIp,
  whereWithDeleted,
} = require('./common');

const TEACHER_NOT_FOUND = 'TEACHER_NOT_FOUND';

async function assertUniqueIdentity({ email, employeeCode }, excludeId = null) {
  const exclude = excludeId ? { NOT: { id: excludeId } } : {};

  if (email) {
    const existing = await prisma.teacher.findFirst({
      where: { email, ...exclude },
      select: { id: true },
    });
    if (existing) {
      throw conflict('A teacher with this email already exists.', 'TEACHER_EMAIL_CONFLICT');
    }
  }

  if (employeeCode) {
    const existing = await prisma.teacher.findFirst({
      where: { employeeCode, ...exclude },
      select: { id: true },
    });
    if (existing) {
      throw conflict(
        'A teacher with this employee code already exists.',
        'TEACHER_EMPLOYEE_CODE_CONFLICT'
      );
    }
  }
}

function rethrowUnique(error) {
  if (isUniqueViolation(error)) {
    throw conflict(
      'A teacher with this email or employee code already exists.',
      'TEACHER_CONFLICT'
    );
  }
  throw error;
}

async function findTeacherOrThrow(id, { includeDeleted = false } = {}) {
  const teacher = await prisma.teacher.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
  });

  if (!teacher) {
    throw notFound('Teacher', TEACHER_NOT_FOUND);
  }

  return teacher;
}

async function listTeachers({
  page = 1,
  limit = 20,
  q,
  isActive,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  includeDeleted = false,
} = {}) {
  const where = whereWithDeleted({}, includeDeleted);

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  if (q) {
    where.OR = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { employeeCode: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toPublicTeacher),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getTeacherById(id, { includeDeleted = false } = {}) {
  const teacher = await findTeacherOrThrow(id, { includeDeleted });
  return toPublicTeacher(teacher);
}

async function createTeacher(payload, admin, requestMeta = {}) {
  await assertUniqueIdentity({
    email: payload.email,
    employeeCode: payload.employeeCode,
  });

  const passwordHash = await hashPassword(payload.password);

  try {
    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.teacher.create({
        data: {
          email: payload.email,
          passwordHash,
          firstName: payload.firstName,
          lastName: payload.lastName,
          employeeCode: payload.employeeCode || null,
          phone: payload.phone || null,
          isActive: payload.isActive !== false,
        },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'teachers.create',
        entityType: 'Teacher',
        entityId: created.id,
        metadata: { email: created.email },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    const result = toPublicTeacher(teacher);
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyTeacherAccountCreated(result);
    return result;
  } catch (error) {
    return rethrowUnique(error);
  }
}

async function updateTeacher(id, updates, admin, requestMeta = {}) {
  const existing = await findTeacherOrThrow(id);
  const data = {};

  for (const field of ['firstName', 'lastName', 'phone']) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      data[field] = updates[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'employeeCode')) {
    data.employeeCode = updates.employeeCode || null;
  }

  if (updates.email && updates.email !== existing.email) {
    data.email = updates.email;
  }

  await assertUniqueIdentity(
    { email: data.email, employeeCode: data.employeeCode },
    existing.id
  );

  if (updates.password) {
    data.passwordHash = await hashPassword(updates.password);
    // Revoke existing sessions when the password changes.
    data.tokenVersion = { increment: 1 };
  }

  try {
    const teacher = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({ where: { id: existing.id }, data });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'teachers.update',
        entityType: 'Teacher',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates).filter((field) => field !== 'password') },
        ipAddress: getIp(requestMeta),
      });

      return updated;
    });

    return toPublicTeacher(teacher);
  } catch (error) {
    return rethrowUnique(error);
  }
}

async function setTeacherActive(id, isActive, admin, requestMeta = {}) {
  const existing = await findTeacherOrThrow(id);

  const teacher = await prisma.$transaction(async (tx) => {
    const updated = await tx.teacher.update({
      where: { id: existing.id },
      data: {
        isActive,
        // Deactivation revokes outstanding tokens.
        ...(isActive ? {} : { tokenVersion: { increment: 1 } }),
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: isActive ? 'teachers.activate' : 'teachers.deactivate',
      entityType: 'Teacher',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toPublicTeacher(teacher);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAccountStatusChanged({
    type: 'TEACHER',
    id: result.id,
    isActive,
  });
  return result;
}

async function softDeleteTeacher(id, admin, requestMeta = {}) {
  const existing = await findTeacherOrThrow(id);

  const teacher = await prisma.$transaction(async (tx) => {
    const updated = await tx.teacher.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        tokenVersion: { increment: 1 },
      },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'teachers.delete',
      entityType: 'Teacher',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toPublicTeacher(teacher);
}

async function restoreTeacher(id, admin, requestMeta = {}) {
  const existing = await prisma.teacher.findFirst({
    where: { id, deletedAt: { not: null } },
  });

  if (!existing) {
    throw notFound('Deleted teacher', TEACHER_NOT_FOUND);
  }

  const teacher = await prisma.$transaction(async (tx) => {
    // Restored accounts stay inactive until an admin explicitly activates them.
    const updated = await tx.teacher.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'teachers.restore',
      entityType: 'Teacher',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toPublicTeacher(teacher);
}

module.exports = {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  setTeacherActive,
  softDeleteTeacher,
  restoreTeacher,
  findTeacherOrThrow,
};
