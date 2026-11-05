const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const {
  getSettingDefinition,
  isAllowedSettingKey,
  isPublicSettingKey,
  PUBLIC_SETTING_KEYS,
} = require('../config/settings.catalog');
const { recordAudit } = require('./audit.service');

function toAdminSetting(row) {
  const definition = getSettingDefinition(row.key);
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    group: row.group,
    label: row.label,
    isPublic: definition ? definition.public : false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    updatedById: row.updatedById,
    updatedBy: row.updatedBy
      ? {
          id: row.updatedBy.id,
          firstName: row.updatedBy.firstName,
          lastName: row.updatedBy.lastName,
          email: row.updatedBy.email,
        }
      : null,
  };
}

const updatedByInclude = {
  updatedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

function assertAllowedKey(key) {
  if (!isAllowedSettingKey(key)) {
    throw new AppError('Unknown or unsupported setting key.', 422, {
      code: 'SETTING_KEY_INVALID',
      errors: [{ field: 'key', message: `key "${key}" is not allowed` }],
    });
  }
}

function validateSettingValue(key, value) {
  const definition = getSettingDefinition(key);
  assertAllowedKey(key);

  if (typeof value !== 'string') {
    throw new AppError('Setting value must be a string.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'value', message: 'value must be a string' }],
    });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('Setting value cannot be empty.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'value', message: 'value is required' }],
    });
  }

  if (trimmed.length > definition.maxLength) {
    throw new AppError(`Setting value exceeds ${definition.maxLength} characters.`, 422, {
      code: 'VALIDATION_ERROR',
      errors: [
        {
          field: 'value',
          message: `value must be at most ${definition.maxLength} characters`,
        },
      ],
    });
  }

  if (definition.type === 'email') {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailOk || trimmed.length > 255) {
      throw new AppError('Invalid email address.', 422, {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'value', message: 'value must be a valid email address' }],
      });
    }
  }

  if (definition.type === 'url') {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch (_error) {
      throw new AppError('Invalid URL.', 422, {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'value', message: 'value must be a valid URL' }],
      });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError('URL must use http or https.', 422, {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'value', message: 'value must be an http or https URL' }],
      });
    }
  }

  if (definition.type === 'phone') {
    if (!/^[+]?[\d\s().-]+$/.test(trimmed)) {
      throw new AppError('Invalid phone number.', 422, {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'value', message: 'phone format is invalid' }],
      });
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw new AppError('Invalid phone number.', 422, {
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'value', message: 'phone must contain between 7 and 15 digits' }],
      });
    }
  }

  return trimmed;
}

async function getPublicSettings() {
  const rows = await prisma.websiteSetting.findMany({
    where: {
      key: { in: [...PUBLIC_SETTING_KEYS] },
    },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });

  const settings = {};
  for (const row of rows) {
    if (isPublicSettingKey(row.key)) {
      settings[row.key] = row.value;
    }
  }

  return { settings };
}

async function listAdminSettings({ group } = {}) {
  const where = {};
  if (group) {
    where.group = group;
  }

  const rows = await prisma.websiteSetting.findMany({
    where,
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
    include: updatedByInclude,
  });

  // Only return allowlisted keys (ignore any unexpected legacy rows).
  return {
    items: rows.filter((row) => isAllowedSettingKey(row.key)).map(toAdminSetting),
  };
}

async function getAdminSettingByKey(key) {
  assertAllowedKey(key);

  const row = await prisma.websiteSetting.findUnique({
    where: { key },
    include: updatedByInclude,
  });

  if (!row) {
    throw new AppError('Setting not found.', 404, {
      code: 'SETTING_NOT_FOUND',
    });
  }

  return toAdminSetting(row);
}

async function upsertManySettings(settingsMap, admin, requestMeta = {}) {
  const entries = Object.entries(settingsMap || {});

  if (entries.length === 0) {
    throw new AppError('At least one setting must be provided.', 422, {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'settings', message: 'settings object cannot be empty' }],
    });
  }

  const prepared = entries.map(([key, value]) => {
    assertAllowedKey(key);
    const definition = getSettingDefinition(key);
    return {
      key,
      value: validateSettingValue(key, value),
      group: definition.group,
      label: definition.label,
    };
  });

  const results = await prisma.$transaction(async (tx) => {
    const saved = [];

    for (const item of prepared) {
      const existing = await tx.websiteSetting.findUnique({
        where: { key: item.key },
        select: { id: true, value: true },
      });

      const row = await tx.websiteSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value,
          group: item.group,
          label: item.label,
          updatedById: admin.id,
        },
        update: {
          value: item.value,
          group: item.group,
          label: item.label,
          updatedById: admin.id,
        },
        include: updatedByInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: existing ? 'settings.update' : 'settings.create',
        entityType: 'WebsiteSetting',
        entityId: row.id,
        metadata: {
          key: row.key,
          group: row.group,
          // Do not log setting values (may contain internal notes).
        },
        ipAddress: requestMeta.ipAddress,
      });

      saved.push(row);
    }

    return saved;
  });

  return {
    items: results.map(toAdminSetting),
  };
}

async function patchSetting(key, value, admin, requestMeta = {}) {
  assertAllowedKey(key);
  const definition = getSettingDefinition(key);
  const normalizedValue = validateSettingValue(key, value);

  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.websiteSetting.findUnique({
        where: { key },
        select: { id: true },
      });

      const saved = await tx.websiteSetting.upsert({
        where: { key },
        create: {
          key,
          value: normalizedValue,
          group: definition.group,
          label: definition.label,
          updatedById: admin.id,
        },
        update: {
          value: normalizedValue,
          group: definition.group,
          label: definition.label,
          updatedById: admin.id,
        },
        include: updatedByInclude,
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: existing ? 'settings.update' : 'settings.create',
        entityType: 'WebsiteSetting',
        entityId: saved.id,
        metadata: { key: saved.key, group: saved.group },
        ipAddress: requestMeta.ipAddress,
      });

      return saved;
    });

    return toAdminSetting(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A setting with this key already exists.', 409, {
        code: 'SETTING_KEY_CONFLICT',
      });
    }
    throw error;
  }
}

async function deleteSetting(key, admin, requestMeta = {}) {
  assertAllowedKey(key);
  const definition = getSettingDefinition(key);

  if (definition.deletable === false) {
    throw new AppError('This setting cannot be deleted.', 400, {
      code: 'SETTING_NOT_DELETABLE',
    });
  }

  const existing = await prisma.websiteSetting.findUnique({
    where: { key },
  });

  if (!existing) {
    throw new AppError('Setting not found.', 404, {
      code: 'SETTING_NOT_FOUND',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.websiteSetting.delete({
      where: { key },
    });

    await recordAudit({
      tx,
      adminId: admin.id,
      action: 'settings.delete',
      entityType: 'WebsiteSetting',
      entityId: existing.id,
      metadata: { key: existing.key, group: existing.group },
      ipAddress: requestMeta.ipAddress,
    });
  });

  return { key };
}

module.exports = {
  getPublicSettings,
  listAdminSettings,
  getAdminSettingByKey,
  upsertManySettings,
  patchSetting,
  deleteSetting,
  validateSettingValue,
  toAdminSetting,
};
