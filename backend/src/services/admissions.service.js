const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const { recordAudit } = require('./audit.service');

const STATUS = Object.freeze({
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CLOSED: 'CLOSED',
});

const VALID_STATUSES = Object.freeze(Object.values(STATUS));

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toPublicSubmissionReceipt(inquiry) {
  return {
    id: inquiry.id,
    studentName: inquiry.studentName,
    email: inquiry.email,
    gradeApplyingFor: inquiry.gradeApplyingFor,
    academicYear: inquiry.academicYear,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
  };
}

function toAdminInquiry(inquiry) {
  return {
    id: inquiry.id,
    studentName: inquiry.studentName,
    guardianName: inquiry.guardianName,
    email: inquiry.email,
    phone: inquiry.phone,
    gradeApplyingFor: inquiry.gradeApplyingFor,
    academicYear: inquiry.academicYear,
    message: inquiry.message,
    status: inquiry.status,
    deletedAt: inquiry.deletedAt,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
}

async function createInquiry(payload) {
  const inquiry = await prisma.admissionInquiry.create({
    data: {
      studentName: payload.studentName,
      guardianName: payload.guardianName || null,
      email: payload.email,
      phone: payload.phone,
      gradeApplyingFor: payload.gradeApplyingFor,
      academicYear: payload.academicYear,
      message: payload.message,
      status: STATUS.NEW,
    },
  });

  return toPublicSubmissionReceipt(inquiry);
}

async function listInquiries({
  page = 1,
  limit = 20,
  q,
  status,
  gradeApplyingFor,
  academicYear,
  sortOrder = 'desc',
  includeDeleted = false,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (status) {
    where.status = status;
  }

  if (gradeApplyingFor) {
    where.gradeApplyingFor = gradeApplyingFor;
  }

  if (academicYear) {
    where.academicYear = academicYear;
  }

  if (q) {
    where.OR = [
      { studentName: { contains: q } },
      { guardianName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.admissionInquiry.count({ where }),
    prisma.admissionInquiry.findMany({
      where,
      orderBy: [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(toAdminInquiry),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function findInquiryOrThrow(id, { includeDeleted = false } = {}) {
  const inquiry = await prisma.admissionInquiry.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
  });

  if (!inquiry) {
    throw new AppError('Admission inquiry not found.', 404, {
      code: 'ADMISSION_INQUIRY_NOT_FOUND',
    });
  }

  return inquiry;
}

async function getInquiryById(id) {
  const inquiry = await findInquiryOrThrow(id);
  return toAdminInquiry(inquiry);
}

async function updateStatus(id, status, admin, requestMeta = {}) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid admission inquiry status.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'status', message: 'status is not supported' }],
    });
  }

  const existing = await findInquiryOrThrow(id);

  const inquiry = await prisma.$transaction(async (tx) => {
    const updated = await tx.admissionInquiry.update({
      where: { id: existing.id },
      data: { status },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'admissions.status_update',
      entityType: 'AdmissionInquiry',
      entityId: updated.id,
      metadata: {
        from: existing.status,
        to: status,
        gradeApplyingFor: updated.gradeApplyingFor,
        academicYear: updated.academicYear,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminInquiry(inquiry);
}

async function softDeleteInquiry(id, admin, requestMeta = {}) {
  const existing = await findInquiryOrThrow(id);

  const inquiry = await prisma.$transaction(async (tx) => {
    const updated = await tx.admissionInquiry.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'admissions.delete',
      entityType: 'AdmissionInquiry',
      entityId: updated.id,
      metadata: {
        previousStatus: existing.status,
        gradeApplyingFor: existing.gradeApplyingFor,
        academicYear: existing.academicYear,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminInquiry(inquiry);
}

async function restoreInquiry(id, admin, requestMeta = {}) {
  const existing = await findInquiryOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Admission inquiry is not deleted.', 400, {
      code: 'ADMISSION_INQUIRY_NOT_DELETED',
    });
  }

  const inquiry = await prisma.$transaction(async (tx) => {
    const updated = await tx.admissionInquiry.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'admissions.restore',
      entityType: 'AdmissionInquiry',
      entityId: updated.id,
      metadata: {
        status: updated.status,
        gradeApplyingFor: updated.gradeApplyingFor,
        academicYear: updated.academicYear,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminInquiry(inquiry);
}

module.exports = {
  STATUS,
  VALID_STATUSES,
  createInquiry,
  listInquiries,
  getInquiryById,
  updateStatus,
  softDeleteInquiry,
  restoreInquiry,
};
