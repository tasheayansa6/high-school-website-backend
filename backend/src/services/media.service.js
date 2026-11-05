const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const { notDeleted } = require('../utils/softDelete');
const { detectFileSignature } = require('../utils/fileSignature');
const { buildMediaContentUrl } = require('../utils/mediaUrl');
const { recordAudit } = require('./audit.service');
const storageService = require('./storage.service');

let forceDatabaseFailureForTests = false;

function setForceDatabaseFailureForTests(value) {
  forceDatabaseFailureForTests = Boolean(value);
}

function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function toAdminMedia(asset) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    altText: asset.altText,
    description: asset.description,
    isGalleryImage: asset.isGalleryImage,
    sortOrder: asset.sortOrder,
    deletedAt: asset.deletedAt,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    uploadedById: asset.uploadedById,
    url: buildMediaContentUrl(asset.id),
    uploadedBy: asset.uploadedBy
      ? {
          id: asset.uploadedBy.id,
          firstName: asset.uploadedBy.firstName,
          lastName: asset.uploadedBy.lastName,
          email: asset.uploadedBy.email,
        }
      : null,
  };
}

const uploadedByInclude = {
  uploadedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

async function findMediaOrThrow(id, { includeDeleted = false } = {}) {
  const asset = await prisma.mediaAsset.findFirst({
    where: includeDeleted ? { id } : notDeleted({ id }),
    include: uploadedByInclude,
  });

  if (!asset) {
    throw new AppError('Media asset not found.', 404, {
      code: 'MEDIA_NOT_FOUND',
    });
  }

  return asset;
}

async function uploadMedia({ file, metadata = {} }, admin, requestMeta = {}) {
  if (!file || !file.buffer) {
    throw new AppError('A file is required.', 400, {
      code: 'FILE_REQUIRED',
    });
  }

  const detected = detectFileSignature(file.buffer);
  if (!detected) {
    throw new AppError('Unsupported or unrecognized file type.', 415, {
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }

  await storageService.ensureStorageReady();

  let relativeKey;
  try {
    const saved = await storageService.saveBuffer({
      buffer: file.buffer,
      extension: detected.extension,
    });
    relativeKey = saved.relativeKey;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to store uploaded file.', 503, {
      code: 'STORAGE_WRITE_FAILED',
    });
  }

  const originalName = String(file.originalname || 'upload')
    .replace(/[/\\]/g, '_')
    .slice(0, 255);

  try {
    if (forceDatabaseFailureForTests) {
      throw new Error('Forced database failure for tests');
    }

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          fileName: pathBasename(relativeKey),
          originalName,
          mimeType: detected.mimeType,
          fileSize: file.buffer.length,
          storagePath: relativeKey,
          altText: metadata.altText || null,
          description: metadata.description || null,
          isGalleryImage: metadata.isGalleryImage === true,
          sortOrder: Number.isInteger(metadata.sortOrder) ? metadata.sortOrder : 0,
          uploadedById: admin.id,
        },
        include: uploadedByInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: 'media.upload',
        entityType: 'MediaAsset',
        entityId: created.id,
        metadata: {
          mimeType: created.mimeType,
          fileSize: created.fileSize,
          originalName: created.originalName,
        },
        ipAddress: requestMeta.ipAddress,
      });

      return created;
    });

    return toAdminMedia(asset);
  } catch (error) {
    await storageService.deleteObject(relativeKey).catch(() => {});

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to save media metadata.', 500, {
      code: 'MEDIA_PERSIST_FAILED',
    });
  }
}

function pathBasename(relativeKey) {
  const parts = String(relativeKey).split('/');
  return parts[parts.length - 1] || relativeKey;
}

async function listMedia({
  page = 1,
  limit = 20,
  q,
  mimeType,
  isGalleryImage,
  sortOrder = 'desc',
  includeDeleted = false,
} = {}) {
  const where = includeDeleted ? {} : notDeleted({});

  if (mimeType) {
    where.mimeType = mimeType;
  }

  if (typeof isGalleryImage === 'boolean') {
    where.isGalleryImage = isGalleryImage;
  }

  if (q) {
    where.OR = [
      { originalName: { contains: q } },
      { fileName: { contains: q } },
      { altText: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: uploadedByInclude,
    }),
  ]);

  return {
    items: items.map(toAdminMedia),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getMediaById(id, { includeDeleted = false } = {}) {
  const asset = await findMediaOrThrow(id, { includeDeleted });
  return toAdminMedia(asset);
}

async function updateMedia(id, updates, admin, requestMeta = {}) {
  const existing = await findMediaOrThrow(id);
  const data = {};

  if (typeof updates.altText === 'string' || updates.altText === null) {
    data.altText = updates.altText;
  }

  if (typeof updates.description === 'string' || updates.description === null) {
    data.description = updates.description;
  }

  if (typeof updates.isGalleryImage === 'boolean') {
    data.isGalleryImage = updates.isGalleryImage;
  }

  if (Number.isInteger(updates.sortOrder)) {
    data.sortOrder = updates.sortOrder;
  }

  const asset = await prisma.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id: existing.id },
      data,
      include: uploadedByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'media.update',
      entityType: 'MediaAsset',
      entityId: updated.id,
      metadata: { fields: Object.keys(updates) },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMedia(asset);
}

async function countActiveReferences(mediaId) {
  const [blogCount, eventCount] = await Promise.all([
    prisma.blogPost.count({
      where: notDeleted({ featuredImageId: mediaId }),
    }),
    prisma.event.count({
      where: notDeleted({ featuredImageId: mediaId }),
    }),
  ]);

  return { blogCount, eventCount, total: blogCount + eventCount };
}

async function softDeleteMedia(id, admin, requestMeta = {}) {
  const existing = await findMediaOrThrow(id);
  const refs = await countActiveReferences(existing.id);

  if (refs.total > 0) {
    throw new AppError(
      'Media asset is referenced by content and cannot be deleted.',
      409,
      {
        code: 'MEDIA_IN_USE',
        errors: [
          {
            field: 'id',
            message: `Referenced by ${refs.blogCount} blog post(s) and ${refs.eventCount} event(s)`,
          },
        ],
      }
    );
  }

  // Soft-delete only: keep the file on disk for restore.
  const asset = await prisma.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: uploadedByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'media.delete',
      entityType: 'MediaAsset',
      entityId: updated.id,
      metadata: {
        mimeType: updated.mimeType,
        originalName: updated.originalName,
      },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMedia(asset);
}

async function restoreMedia(id, admin, requestMeta = {}) {
  const existing = await findMediaOrThrow(id, { includeDeleted: true });

  if (!existing.deletedAt) {
    throw new AppError('Media asset is not deleted.', 400, {
      code: 'MEDIA_NOT_DELETED',
    });
  }

  // Ensure the physical file still exists before restoring.
  await storageService.readBuffer(existing.storagePath);

  const asset = await prisma.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id: existing.id },
      data: { deletedAt: null },
      include: uploadedByInclude,
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'media.restore',
      entityType: 'MediaAsset',
      entityId: updated.id,
      metadata: { originalName: updated.originalName },
      ipAddress: requestMeta.ipAddress,
    });

    return updated;
  });

  return toAdminMedia(asset);
}

async function getPublicMediaContent(id) {
  const asset = await prisma.mediaAsset.findFirst({
    where: notDeleted({ id }),
  });

  if (!asset) {
    throw new AppError('Media asset not found.', 404, {
      code: 'MEDIA_NOT_FOUND',
    });
  }

  const stream = await storageService.openReadStream(asset.storagePath);

  return {
    stream,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    fileName: asset.fileName,
  };
}

module.exports = {
  uploadMedia,
  listMedia,
  getMediaById,
  updateMedia,
  softDeleteMedia,
  restoreMedia,
  getPublicMediaContent,
  toAdminMedia,
  setForceDatabaseFailureForTests,
};
