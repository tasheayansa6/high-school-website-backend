const { prisma } = require('../../config/database');
const { hashPassword } = require('../../utils/password');
const { toPublicStudent } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  getIp,
  whereWithDeleted,
} = require('./common');

const STUDENT_NOT_FOUND = 'STUDENT_NOT_FOUND';

async function assertUniqueIdentity({ email, studentCode }, excludeId = null) {
  const exclude = excludeId ? { NOT: { id: excludeId } } : {};

  if (email) {
    const existing = await prisma.student.findFirst({
      where: { email, ...exclude },
      select: { id: true },
    });
    if (existing) {
      throw conflict('A student with this email already exists.', 'STUDENT_EMAIL_CONFLICT');
    }
  }

  if (studentCode) {
    const existing = await prisma.student.findFirst({
      where: { studentCode, ...exclude },
      select: { id: true },
    });
    if (existing) {
      throw conflict(
        'A student with this student code already exists.',
        'STUDENT_CODE_CONFLICT'
      );
    }
  }
}

function rethrowUnique(error) {
  if (isUniqueViolation(error)) {
    throw conflict(
      'A student with this email or student code already exists.',
      'STUDENT_CONFLICT'
    );
  }
  throw error;
}

async function findStudentOrThrow(id, { includeDeleted = false } = {}) {
  const student = await prisma.student.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
  });

  if (!student) {
    throw notFound('Student', STUDENT_NOT_FOUND);
  }

  return student;
}

async function listStudents({
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
      { studentCode: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toPublicStudent),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getStudentById(id, { includeDeleted = false } = {}) {
  const student = await findStudentOrThrow(id, { includeDeleted });
  return toPublicStudent(student);
}

async function createStudent(payload, admin, requestMeta = {}) {
  await assertUniqueIdentity({
    email: payload.email,
    studentCode: payload.studentCode,
  });

  const passwordHash = await hashPassword(payload.password);

  try {
    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          email: payload.email,
          passwordHash,
          firstName: payload.firstName,
          lastName: payload.lastName,
          studentCode: payload.studentCode,
          dateOfBirth: payload.dateOfBirth || null,
          gender: payload.gender || null,
          phone: payload.phone || null,
          guardianName: payload.guardianName || null,
          guardianPhone: payload.guardianPhone || null,
          isActive: payload.isActive !== false,
        },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'students.create',
        entityType: 'Student',
        entityId: created.id,
        metadata: { email: created.email, studentCode: created.studentCode },
        ipAddress: getIp(requestMeta),
      });

      return created;
    });

    const result = toPublicStudent(student);
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyStudentAccountCreated(result);
    return result;
  } catch (error) {
    return rethrowUnique(error);
  }
}

async function updateStudent(id, updates, admin, requestMeta = {}) {
  const existing = await findStudentOrThrow(id);
  const data = {};

  for (const field of ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'guardianName', 'guardianPhone']) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      data[field] = updates[field];
    }
  }

  if (updates.studentCode) {
    data.studentCode = updates.studentCode;
  }

  if (updates.email && updates.email !== existing.email) {
    data.email = updates.email;
  }

  await assertUniqueIdentity(
    { email: data.email, studentCode: data.studentCode },
    existing.id
  );

  if (updates.password) {
    data.passwordHash = await hashPassword(updates.password);
    // Revoke existing sessions when the password changes.
    data.tokenVersion = { increment: 1 };
  }

  try {
    const student = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({ where: { id: existing.id }, data });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'students.update',
        entityType: 'Student',
        entityId: updated.id,
        metadata: { fields: Object.keys(updates).filter((field) => field !== 'password') },
        ipAddress: getIp(requestMeta),
      });

      return updated;
    });

    return toPublicStudent(student);
  } catch (error) {
    return rethrowUnique(error);
  }
}

async function setStudentActive(id, isActive, admin, requestMeta = {}) {
  const existing = await findStudentOrThrow(id);

  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
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
      action: isActive ? 'students.activate' : 'students.deactivate',
      entityType: 'Student',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toPublicStudent(student);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyAccountStatusChanged({
    type: 'STUDENT',
    id: result.id,
    isActive,
  });
  return result;
}

async function softDeleteStudent(id, admin, requestMeta = {}) {
  const existing = await findStudentOrThrow(id);

  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
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
      action: 'students.delete',
      entityType: 'Student',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toPublicStudent(student);
}

async function restoreStudent(id, admin, requestMeta = {}) {
  const existing = await prisma.student.findFirst({
    where: { id, deletedAt: { not: null } },
  });

  if (!existing) {
    throw notFound('Deleted student', STUDENT_NOT_FOUND);
  }

  const student = await prisma.$transaction(async (tx) => {
    // Restored accounts stay inactive until an admin explicitly activates them.
    const updated = await tx.student.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'students.restore',
      entityType: 'Student',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toPublicStudent(student);
}

module.exports = {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  setStudentActive,
  softDeleteStudent,
  restoreStudent,
  findStudentOrThrow,
};
