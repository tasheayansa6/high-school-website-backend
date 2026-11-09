const { Prisma } = require('@prisma/client');
const { prisma } = require('../../config/database');
const { toStudentRef } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  conflict,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');
const { toNumber, toDateOnly, auditActor, studentRefSelect, findStudentOrThrow } = require('./ops.helpers');

const FEE_STRUCTURE_NOT_FOUND = 'FEE_STRUCTURE_NOT_FOUND';
const STUDENT_FEE_NOT_FOUND = 'STUDENT_FEE_NOT_FOUND';
const PAYMENT_NOT_FOUND = 'FEE_PAYMENT_NOT_FOUND';

const D = (value) => new Prisma.Decimal(value);

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

function toFeeStructure(structure) {
  return {
    id: structure.id,
    name: structure.name,
    description: structure.description,
    amount: toNumber(structure.amount),
    currency: structure.currency,
    isActive: structure.isActive,
    deletedAt: structure.deletedAt,
    createdAt: structure.createdAt,
    updatedAt: structure.updatedAt,
  };
}

function toFeePayment(payment) {
  return {
    id: payment.id,
    studentFeeId: payment.studentFeeId,
    amount: toNumber(payment.amount),
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    paidAt: payment.paidAt,
    recordedById: payment.recordedById,
    notes: payment.notes,
    deletedAt: payment.deletedAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

const studentFeeInclude = {
  student: { select: studentRefSelect },
  feeStructure: true,
  academicYear: { select: { id: true, name: true, code: true } },
  academicTerm: { select: { id: true, name: true } },
};

function toStudentFee(fee, { payments } = {}) {
  const amountDue = toNumber(fee.amountDue);
  const amountPaid = toNumber(fee.amountPaid);
  const result = {
    id: fee.id,
    studentId: fee.studentId,
    feeStructureId: fee.feeStructureId,
    academicYearId: fee.academicYearId,
    academicTermId: fee.academicTermId,
    amountDue,
    amountPaid,
    balance: Math.round((amountDue - amountPaid) * 100) / 100,
    status: fee.status,
    dueDate: fee.dueDate,
    notes: fee.notes,
    student: fee.student ? toStudentRef(fee.student) : undefined,
    feeStructure: fee.feeStructure
      ? {
          id: fee.feeStructure.id,
          name: fee.feeStructure.name,
          currency: fee.feeStructure.currency,
          amount: toNumber(fee.feeStructure.amount),
        }
      : undefined,
    academicYear: fee.academicYear || undefined,
    academicTerm: fee.academicTerm || undefined,
    deletedAt: fee.deletedAt,
    createdAt: fee.createdAt,
    updatedAt: fee.updatedAt,
  };
  if (payments) result.payments = payments.map(toFeePayment);
  return result;
}

function computeStatus(amountDue, amountPaid, currentStatus) {
  if (currentStatus === 'WAIVED') return 'WAIVED';
  const due = D(amountDue);
  const paid = D(amountPaid);
  if (paid.lte(0)) return 'UNPAID';
  if (paid.gte(due)) return 'PAID';
  return 'PARTIAL';
}

// ---------------------------------------------------------------------------
// Fee structures
// ---------------------------------------------------------------------------

async function findFeeStructureOrThrow(id, { includeDeleted = false } = {}) {
  const structure = await prisma.feeStructure.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
  });
  if (!structure) throw notFound('Fee structure', FEE_STRUCTURE_NOT_FOUND);
  return structure;
}

async function listFeeStructures({ page = 1, limit = 20, q, isActive, includeDeleted = false } = {}) {
  const where = whereWithDeleted({}, includeDeleted);
  if (isActive !== undefined) where.isActive = isActive;
  if (q) where.name = { contains: q };

  const [total, items] = await Promise.all([
    prisma.feeStructure.count({ where }),
    prisma.feeStructure.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items: items.map(toFeeStructure), pagination: buildPagination({ page, limit, total }) };
}

async function getFeeStructureById(id, options = {}) {
  return toFeeStructure(await findFeeStructureOrThrow(id, options));
}

async function createFeeStructure(payload, actor, requestMeta = {}) {
  const structure = await prisma.$transaction(async (tx) => {
    const created = await tx.feeStructure.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        amount: payload.amount,
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'fee-structures.create',
      entityType: 'FeeStructure',
      entityId: created.id,
      metadata: { name: created.name, amount: toNumber(created.amount) },
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  return toFeeStructure(structure);
}

async function updateFeeStructure(id, payload, actor, requestMeta = {}) {
  const existing = await findFeeStructureOrThrow(id);

  const data = {};
  for (const key of ['name', 'description', 'amount', 'currency', 'isActive']) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }

  const structure = await prisma.$transaction(async (tx) => {
    const updated = await tx.feeStructure.update({ where: { id: existing.id }, data });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'fee-structures.update',
      entityType: 'FeeStructure',
      entityId: updated.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toFeeStructure(structure);
}

async function softDeleteFeeStructure(id, actor, requestMeta = {}) {
  const existing = await findFeeStructureOrThrow(id);

  const structure = await prisma.$transaction(async (tx) => {
    const updated = await tx.feeStructure.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'fee-structures.delete',
      entityType: 'FeeStructure',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toFeeStructure(structure);
}

// ---------------------------------------------------------------------------
// Student fees
// ---------------------------------------------------------------------------

async function findStudentFeeOrThrow(id, { includeDeleted = false } = {}) {
  const fee = await prisma.studentFee.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: studentFeeInclude,
  });
  if (!fee) throw notFound('Student fee', STUDENT_FEE_NOT_FOUND);
  return fee;
}

async function listStudentFees(
  { page = 1, limit = 20, studentId, feeStructureId, academicYearId, academicTermId, status, includeDeleted = false } = {}
) {
  const where = whereWithDeleted({}, includeDeleted);
  if (studentId) where.studentId = studentId;
  if (feeStructureId) where.feeStructureId = feeStructureId;
  if (academicYearId) where.academicYearId = academicYearId;
  if (academicTermId) where.academicTermId = academicTermId;
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.studentFee.count({ where }),
    prisma.studentFee.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: studentFeeInclude,
    }),
  ]);

  return { items: items.map((row) => toStudentFee(row)), pagination: buildPagination({ page, limit, total }) };
}

async function getStudentFeeById(id, { includeDeleted = false } = {}) {
  const fee = await findStudentFeeOrThrow(id, { includeDeleted });
  const payments = await prisma.feePayment.findMany({
    where: whereWithDeleted({ studentFeeId: fee.id }, includeDeleted),
    orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
  });
  return toStudentFee(fee, { payments });
}

async function assignStudentFee(payload, actor, requestMeta = {}) {
  const [student, structure, year] = await Promise.all([
    findStudentOrThrow(payload.studentId),
    findFeeStructureOrThrow(payload.feeStructureId),
    prisma.academicYear.findFirst({ where: { id: payload.academicYearId, deletedAt: null } }),
  ]);
  if (!year) throw notFound('Academic year', 'ACADEMIC_YEAR_NOT_FOUND');

  if (payload.academicTermId) {
    const term = await prisma.academicTerm.findFirst({
      where: { id: payload.academicTermId, deletedAt: null },
    });
    if (!term) throw notFound('Academic term', 'ACADEMIC_TERM_NOT_FOUND');
    if (term.academicYearId !== year.id) {
      throw validationFailure('academicTermId must belong to the academic year', 'academicTermId');
    }
  }

  const fee = await prisma.$transaction(async (tx) => {
    const created = await tx.studentFee.create({
      data: {
        studentId: student.id,
        feeStructureId: structure.id,
        academicYearId: year.id,
        academicTermId: payload.academicTermId ?? null,
        amountDue: payload.amountDue !== undefined ? payload.amountDue : structure.amount,
        amountPaid: 0,
        status: 'UNPAID',
        dueDate: payload.dueDate ? toDateOnly(payload.dueDate) : null,
        notes: payload.notes ?? null,
      },
      include: studentFeeInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'student-fees.assign',
      entityType: 'StudentFee',
      entityId: created.id,
      metadata: {
        studentId: student.id,
        feeStructureId: structure.id,
        amountDue: toNumber(created.amountDue),
      },
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  return toStudentFee(fee);
}

async function lockStudentFee(tx, id) {
  await tx.$queryRaw`SELECT id FROM student_fees WHERE id = ${id} FOR UPDATE`;
}

/** Recompute amountPaid from live payments and derive status. */
async function recalculateStudentFee(tx, id, { forceWaived } = {}) {
  const fee = await tx.studentFee.findUnique({ where: { id } });
  const aggregate = await tx.feePayment.aggregate({
    where: { studentFeeId: id, deletedAt: null },
    _sum: { amount: true },
  });
  const paid = aggregate._sum.amount || D(0);

  let currentStatus = fee.status;
  if (forceWaived === true) currentStatus = 'WAIVED';
  if (forceWaived === false && fee.status === 'WAIVED') currentStatus = 'UNPAID';

  return tx.studentFee.update({
    where: { id },
    data: {
      amountPaid: paid,
      status: computeStatus(fee.amountDue, paid, currentStatus),
    },
    include: studentFeeInclude,
  });
}

async function updateStudentFee(id, payload, actor, requestMeta = {}) {
  const existing = await findStudentFeeOrThrow(id);

  const fee = await prisma.$transaction(async (tx) => {
    await lockStudentFee(tx, existing.id);

    const data = {};
    if (payload.amountDue !== undefined) data.amountDue = payload.amountDue;
    if (payload.dueDate !== undefined) data.dueDate = payload.dueDate ? toDateOnly(payload.dueDate) : null;
    if (payload.notes !== undefined) data.notes = payload.notes;

    if (Object.keys(data).length > 0) {
      await tx.studentFee.update({ where: { id: existing.id }, data });
    }

    const updated = await recalculateStudentFee(tx, existing.id, { forceWaived: payload.waived });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'student-fees.update',
      entityType: 'StudentFee',
      entityId: updated.id,
      metadata: { fields: Object.keys(payload), status: updated.status },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toStudentFee(fee);
}

async function softDeleteStudentFee(id, actor, requestMeta = {}) {
  const existing = await findStudentFeeOrThrow(id);

  const fee = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentFee.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: studentFeeInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'student-fees.delete',
      entityType: 'StudentFee',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toStudentFee(fee);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

async function listPayments(studentFeeId, { includeDeleted = false } = {}) {
  const fee = await findStudentFeeOrThrow(studentFeeId);
  const payments = await prisma.feePayment.findMany({
    where: whereWithDeleted({ studentFeeId: fee.id }, includeDeleted),
    orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
  });
  return { studentFee: toStudentFee(fee), items: payments.map(toFeePayment) };
}

/** Records a payment and updates amountPaid + status (UNPAID/PARTIAL/PAID). */
async function recordPayment(studentFeeId, payload, actor, requestMeta = {}) {
  await findStudentFeeOrThrow(studentFeeId);

  const result = await prisma.$transaction(async (tx) => {
    await lockStudentFee(tx, studentFeeId);

    const fee = await tx.studentFee.findFirst({ where: { id: studentFeeId, deletedAt: null } });
    if (!fee) throw notFound('Student fee', STUDENT_FEE_NOT_FOUND);

    if (fee.status === 'WAIVED') {
      throw conflict('This fee has been waived and cannot accept payments.', 'STUDENT_FEE_WAIVED');
    }

    const outstanding = D(fee.amountDue).minus(D(fee.amountPaid));
    if (D(payload.amount).gt(outstanding)) {
      throw validationFailure(
        `amount exceeds the outstanding balance (${outstanding.toFixed(2)})`,
        'amount'
      );
    }

    const payment = await tx.feePayment.create({
      data: {
        studentFeeId: fee.id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod ?? null,
        reference: payload.reference ?? null,
        paidAt: payload.paidAt || new Date(),
        notes: payload.notes ?? null,
        recordedById: actor.adminId || null,
      },
    });

    const updatedFee = await recalculateStudentFee(tx, fee.id);

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'fee-payments.create',
      entityType: 'FeePayment',
      entityId: payment.id,
      metadata: {
        studentFeeId: fee.id,
        amount: toNumber(payment.amount),
        status: updatedFee.status,
      },
      ipAddress: getIp(requestMeta),
    });

    return { payment, fee: updatedFee };
  });

  return { payment: toFeePayment(result.payment), studentFee: toStudentFee(result.fee) };
}

/** Soft-deletes a payment and reverses its effect on the fee. */
async function softDeletePayment(studentFeeId, paymentId, actor, requestMeta = {}) {
  await findStudentFeeOrThrow(studentFeeId);

  const result = await prisma.$transaction(async (tx) => {
    await lockStudentFee(tx, studentFeeId);

    const existing = await tx.feePayment.findFirst({
      where: { id: paymentId, studentFeeId, deletedAt: null },
    });
    if (!existing) throw notFound('Fee payment', PAYMENT_NOT_FOUND);

    const payment = await tx.feePayment.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    const fee = await recalculateStudentFee(tx, studentFeeId);

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'fee-payments.delete',
      entityType: 'FeePayment',
      entityId: payment.id,
      metadata: { studentFeeId, amount: toNumber(payment.amount), status: fee.status },
      ipAddress: getIp(requestMeta),
    });

    return { payment, fee };
  });

  return { payment: toFeePayment(result.payment), studentFee: toStudentFee(result.fee) };
}

/** Student portal: own fees with their live payments. */
async function listStudentFeesForStudent(studentId, { page = 1, limit = 20, academicYearId, status } = {}) {
  const where = { studentId, deletedAt: null };
  if (academicYearId) where.academicYearId = academicYearId;
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.studentFee.count({ where }),
    prisma.studentFee.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        feeStructure: true,
        academicYear: { select: { id: true, name: true, code: true } },
        academicTerm: { select: { id: true, name: true } },
        payments: {
          where: { deletedAt: null },
          orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
        },
      },
    }),
  ]);

  return {
    items: items.map((row) => toStudentFee(row, { payments: row.payments })),
    pagination: buildPagination({ page, limit, total }),
  };
}

module.exports = {
  listFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  softDeleteFeeStructure,
  listStudentFees,
  getStudentFeeById,
  assignStudentFee,
  updateStudentFee,
  softDeleteStudentFee,
  listPayments,
  recordPayment,
  softDeletePayment,
  listStudentFeesForStudent,
};
