/**
 * Learning materials: teacher upload, admin oversight, student access + secure download.
 */
const { prisma } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { recordAudit } = require('../audit.service');
const storageService = require('../storage.service');
const {
  detectLearningMaterialFile,
  isAllowedLearningMaterialExtension,
} = require('../../utils/learningMaterialFileTypes');
const {
  buildPagination,
  notFound,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');
const {
  auditActor,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
} = require('./ops.helpers');

const MATERIAL_NOT_FOUND = 'LEARNING_MATERIAL_NOT_FOUND';

const teacherRefSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  employeeCode: true,
};

const yearRefSelect = { id: true, name: true, code: true, isCurrent: true };
const termRefSelect = { id: true, name: true, sequence: true };

const materialInclude = {
  academicYear: { select: yearRefSelect },
  academicTerm: { select: termRefSelect },
  classOffering: {
    select: {
      ...classRefSelect,
      gradeLevel: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true, code: true } },
    },
  },
  subject: { select: subjectRefSelect },
  teacher: { select: teacherRefSelect },
};

function pathBasename(relativeKey) {
  const parts = String(relativeKey).split('/');
  return parts[parts.length - 1] || relativeKey;
}

function toMaterial(row, { includeStoragePath = false } = {}) {
  if (!row) return null;
  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    academicYearId: row.academicYearId,
    academicTermId: row.academicTermId,
    classOfferingId: row.classOfferingId,
    subjectId: row.subjectId,
    teacherId: row.teacherId,
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt,
    archivedAt: row.archivedAt,
    archivedById: row.archivedById,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    academicYear: row.academicYear ?? undefined,
    academicTerm: row.academicTerm ?? undefined,
    classOffering: row.classOffering ?? undefined,
    subject: row.subject ?? undefined,
    teacher: row.teacher ?? undefined,
  };
  if (includeStoragePath) {
    base.storagePath = row.storagePath;
  }
  return base;
}

async function resolveYearAndTerm(academicYearId, academicTermId) {
  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, deletedAt: null },
  });
  if (!year) throw notFound('Academic year', 'ACADEMIC_YEAR_NOT_FOUND');

  if (academicTermId == null) {
    return { year, term: null };
  }

  const term = await prisma.academicTerm.findFirst({
    where: { id: academicTermId, academicYearId, deletedAt: null },
  });
  if (!term) {
    throw validationFailure(
      'academicTermId must belong to the selected academic year',
      'academicTermId'
    );
  }
  return { year, term };
}

async function assertTeacherEligible({ teacherId, classOfferingId, subjectId, academicTermId }) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, deletedAt: null },
  });
  if (!teacher) throw notFound('Teacher', 'TEACHER_NOT_FOUND');
  if (!teacher.isActive) {
    throw validationFailure('Teacher account is inactive', 'teacherId');
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      classOfferingId,
      subjectId,
      deletedAt: null,
    },
  });
  if (!assignments.length) {
    throw validationFailure(
      'You are not assigned to teach this subject in this class',
      'classOfferingId'
    );
  }

  const eligible = assignments.some((row) => {
    if (row.academicTermId == null) return true;
    if (academicTermId == null) return false;
    return row.academicTermId === academicTermId;
  });
  if (!eligible) {
    throw validationFailure(
      'Your teaching assignment does not cover this academic term',
      'academicTermId'
    );
  }
}

function validateUploadFile(file) {
  if (!file || !file.buffer) {
    throw new AppError('A file is required.', 400, { code: 'FILE_REQUIRED' });
  }
  if (!isAllowedLearningMaterialExtension(file.originalname)) {
    throw new AppError('File extension is not allowed for learning materials.', 415, {
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }
  const detected = detectLearningMaterialFile(file.buffer, file.originalname);
  if (!detected) {
    throw new AppError('Unsupported or unrecognized file type.', 415, {
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }
  return detected;
}

async function storeFile(file, detected) {
  await storageService.ensureStorageReady();
  const saved = await storageService.saveBuffer({
    buffer: file.buffer,
    extension: detected.extension,
  });
  // Prefix conceptually via year/month already in key; keep relative key only.
  return {
    relativeKey: saved.relativeKey,
    fileName: pathBasename(saved.relativeKey),
    fileSize: file.buffer.length,
    mimeType: detected.mimeType,
    originalName: String(file.originalname || 'upload')
      .replace(/[/\\]/g, '_')
      .slice(0, 255),
  };
}

function buildListWhere(query, { teacherId = null, studentClassIds = null } = {}) {
  const where = whereWithDeleted({}, query.includeDeleted === true);
  if (!query.includeArchived) {
    where.archivedAt = null;
  }
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { description: { contains: query.q } },
      { originalName: { contains: query.q } },
    ];
  }
  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.academicTermId !== undefined) where.academicTermId = query.academicTermId;
  if (query.classOfferingId) where.classOfferingId = query.classOfferingId;
  if (query.subjectId) where.subjectId = query.subjectId;
  if (query.teacherId) where.teacherId = query.teacherId;
  if (query.category) where.category = query.category;
  if (query.isPublished !== undefined) where.isPublished = query.isPublished;
  if (teacherId != null) where.teacherId = teacherId;
  if (studentClassIds != null) {
    where.classOfferingId = { in: studentClassIds };
    where.isPublished = true;
    where.archivedAt = null;
    where.deletedAt = null;
  }
  return where;
}

async function listMaterials(query = {}, scope = {}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const where = buildListWhere(query, scope);
  const [total, rows] = await Promise.all([
    prisma.learningMaterial.count({ where }),
    prisma.learningMaterial.findMany({
      where,
      include: materialInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    items: rows.map((row) => toMaterial(row)),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getStats(query = {}) {
  const where = buildListWhere({ ...query, includeArchived: true }, {});
  delete where.archivedAt;
  const [total, published, draft, archived] = await Promise.all([
    prisma.learningMaterial.count({ where: { ...where, deletedAt: null } }),
    prisma.learningMaterial.count({
      where: { ...where, deletedAt: null, archivedAt: null, isPublished: true },
    }),
    prisma.learningMaterial.count({
      where: { ...where, deletedAt: null, archivedAt: null, isPublished: false },
    }),
    prisma.learningMaterial.count({
      where: { ...where, deletedAt: null, archivedAt: { not: null } },
    }),
  ]);
  const sizeAgg = await prisma.learningMaterial.aggregate({
    where: { ...where, deletedAt: null, archivedAt: null },
    _sum: { fileSize: true },
  });
  return {
    total,
    published,
    draft,
    archived,
    totalFileBytes: sizeAgg._sum.fileSize || 0,
  };
}

async function getById(id, { includeDeleted = false } = {}) {
  const row = await prisma.learningMaterial.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: materialInclude,
  });
  if (!row) throw notFound('Learning material', MATERIAL_NOT_FOUND);
  return toMaterial(row);
}

async function createForTeacher(payload, file, teacher, requestMeta = {}) {
  const academicTermId =
    payload.academicTermId === undefined || payload.academicTermId === null
      ? null
      : payload.academicTermId;

  const { year } = await resolveYearAndTerm(payload.academicYearId, academicTermId);
  const klass = await findClassOfferingOrThrow(payload.classOfferingId);
  if (klass.academicYearId !== year.id) {
    throw validationFailure('Class does not belong to the selected academic year', 'classOfferingId');
  }
  await findSubjectOrThrow(payload.subjectId);
  await assertTeacherEligible({
    teacherId: teacher.id,
    classOfferingId: payload.classOfferingId,
    subjectId: payload.subjectId,
    academicTermId,
  });

  const detected = validateUploadFile(file);
  let stored;
  try {
    stored = await storeFile(file, detected);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to store uploaded file.', 503, { code: 'STORAGE_WRITE_FAILED' });
  }

  const publish = payload.publish === true;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.learningMaterial.create({
        data: {
          title: payload.title,
          description: payload.description ?? null,
          category: payload.category || 'OTHER',
          academicYearId: payload.academicYearId,
          academicTermId,
          classOfferingId: payload.classOfferingId,
          subjectId: payload.subjectId,
          teacherId: teacher.id,
          fileName: stored.fileName,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          storagePath: stored.relativeKey,
          isPublished: publish,
          publishedAt: publish ? new Date() : null,
        },
        include: materialInclude,
      });

      await recordAudit({
        tx,
        ...auditActor({ teacherId: teacher.id }),
        action: 'learning_material.create',
        entityType: 'LearningMaterial',
        entityId: row.id,
        metadata: {
          mimeType: row.mimeType,
          fileSize: row.fileSize,
          classOfferingId: row.classOfferingId,
          subjectId: row.subjectId,
          published: publish,
        },
        ipAddress: getIp(requestMeta),
      });

      return row;
    });

    const result = toMaterial(created);
    if (publish) {
      const notificationEvents = require('./notification.events');
      await notificationEvents.notifyLearningMaterialPublished(result);
    }
    return result;
  } catch (error) {
    await storageService.deleteObject(stored.relativeKey).catch(() => {});
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to save learning material.', 500, {
      code: 'LEARNING_MATERIAL_PERSIST_FAILED',
    });
  }
}

async function updateForTeacher(id, payload, teacher, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null, archivedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);
  if (existing.teacherId !== teacher.id) {
    throw new AppError('You can only edit your own learning materials.', 403, {
      code: 'FORBIDDEN',
    });
  }

  let academicTermId = existing.academicTermId;
  if (payload.academicTermId !== undefined) {
    academicTermId = payload.academicTermId;
    await resolveYearAndTerm(existing.academicYearId, academicTermId);
    await assertTeacherEligible({
      teacherId: teacher.id,
      classOfferingId: existing.classOfferingId,
      subjectId: existing.subjectId,
      academicTermId,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.learningMaterial.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.academicTermId !== undefined ? { academicTermId } : {}),
      },
      include: materialInclude,
    });

    await recordAudit({
      tx,
      ...auditActor({ teacherId: teacher.id }),
      action: 'learning_material.update',
      entityType: 'LearningMaterial',
      entityId: row.id,
      ipAddress: getIp(requestMeta),
    });

    return row;
  });

  return toMaterial(updated);
}

async function replaceFileForTeacher(id, file, teacher, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null, archivedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);
  if (existing.teacherId !== teacher.id) {
    throw new AppError('You can only replace files on your own materials.', 403, {
      code: 'FORBIDDEN',
    });
  }

  const detected = validateUploadFile(file);
  const stored = await storeFile(file, detected);
  const previousKey = existing.storagePath;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.learningMaterial.update({
        where: { id },
        data: {
          fileName: stored.fileName,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          storagePath: stored.relativeKey,
        },
        include: materialInclude,
      });
      await recordAudit({
        tx,
        ...auditActor({ teacherId: teacher.id }),
        action: 'learning_material.replace_file',
        entityType: 'LearningMaterial',
        entityId: row.id,
        metadata: { mimeType: row.mimeType, fileSize: row.fileSize },
        ipAddress: getIp(requestMeta),
      });
      return row;
    });
    await storageService.deleteObject(previousKey).catch(() => {});
    return toMaterial(updated);
  } catch (error) {
    await storageService.deleteObject(stored.relativeKey).catch(() => {});
    throw error;
  }
}

async function setPublication(id, isPublished, { adminId = null, teacherId = null } = {}, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null, archivedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);

  if (teacherId != null && existing.teacherId !== teacherId) {
    throw new AppError('You can only publish your own learning materials.', 403, {
      code: 'FORBIDDEN',
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.learningMaterial.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: materialInclude,
    });
    await recordAudit({
      tx,
      ...auditActor({ adminId, teacherId }),
      action: isPublished ? 'learning_material.publish' : 'learning_material.unpublish',
      entityType: 'LearningMaterial',
      entityId: row.id,
      ipAddress: getIp(requestMeta),
    });
    return row;
  });

  const result = toMaterial(updated);
  if (isPublished) {
    const notificationEvents = require('./notification.events');
    await notificationEvents.notifyLearningMaterialPublished(result);
  }
  return result;
}

async function softDeleteForTeacher(id, teacher, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);
  if (existing.teacherId !== teacher.id) {
    throw new AppError('You can only delete your own learning materials.', 403, {
      code: 'FORBIDDEN',
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.learningMaterial.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false, publishedAt: null },
      include: materialInclude,
    });
    await recordAudit({
      tx,
      ...auditActor({ teacherId: teacher.id }),
      action: 'learning_material.delete',
      entityType: 'LearningMaterial',
      entityId: row.id,
      ipAddress: getIp(requestMeta),
    });
    return row;
  });

  return toMaterial(updated);
}

async function archiveForAdmin(id, admin, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.learningMaterial.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: admin.id,
        isPublished: false,
        publishedAt: null,
      },
      include: materialInclude,
    });
    await recordAudit({
      tx,
      ...auditActor({ adminId: admin.id }),
      action: 'learning_material.archive',
      entityType: 'LearningMaterial',
      entityId: row.id,
      ipAddress: getIp(requestMeta),
    });
    return row;
  });

  return toMaterial(updated);
}

async function softDeleteForAdmin(id, admin, requestMeta = {}) {
  const existing = await prisma.learningMaterial.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound('Learning material', MATERIAL_NOT_FOUND);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.learningMaterial.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false, publishedAt: null },
      include: materialInclude,
    });
    await recordAudit({
      tx,
      ...auditActor({ adminId: admin.id }),
      action: 'learning_material.admin_delete',
      entityType: 'LearningMaterial',
      entityId: row.id,
      ipAddress: getIp(requestMeta),
    });
    return row;
  });

  return toMaterial(updated);
}

async function listForStudent(studentId, query = {}) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      deletedAt: null,
      classOffering: { deletedAt: null },
    },
    select: { classOfferingId: true },
  });
  const classIds = enrollments.map((e) => e.classOfferingId);
  if (!classIds.length) {
    return { items: [], pagination: buildPagination({ page: 1, limit: query.limit || 20, total: 0 }) };
  }
  return listMaterials(query, { studentClassIds: classIds });
}

async function assertStudentCanAccess(materialId, studentId) {
  const row = await prisma.learningMaterial.findFirst({
    where: {
      id: materialId,
      deletedAt: null,
      archivedAt: null,
      isPublished: true,
    },
  });
  if (!row) throw notFound('Learning material', MATERIAL_NOT_FOUND);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      classOfferingId: row.classOfferingId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
  if (!enrollment) {
    throw new AppError('You are not enrolled in this class.', 403, { code: 'FORBIDDEN' });
  }
  return row;
}

async function assertTeacherCanAccess(materialId, teacherId) {
  const row = await prisma.learningMaterial.findFirst({
    where: { id: materialId, deletedAt: null },
  });
  if (!row) throw notFound('Learning material', MATERIAL_NOT_FOUND);
  if (row.teacherId !== teacherId) {
    throw new AppError('You can only download your own materials.', 403, { code: 'FORBIDDEN' });
  }
  return row;
}

async function openDownloadStream(row) {
  try {
    const stream = await storageService.openReadStream(row.storagePath);
    return {
      stream,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      fileName: row.originalName || row.fileName,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === 'MEDIA_FILE_NOT_FOUND') {
      throw new AppError('Learning material file is missing from storage.', 404, {
        code: 'LEARNING_MATERIAL_FILE_MISSING',
      });
    }
    throw error;
  }
}

module.exports = {
  listMaterials,
  getStats,
  getById,
  createForTeacher,
  updateForTeacher,
  replaceFileForTeacher,
  setPublication,
  softDeleteForTeacher,
  archiveForAdmin,
  softDeleteForAdmin,
  listForStudent,
  assertStudentCanAccess,
  assertTeacherCanAccess,
  openDownloadStream,
  toMaterial,
};
