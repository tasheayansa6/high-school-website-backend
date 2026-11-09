const { prisma } = require('../../config/database');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  isUniqueViolation,
  notFound,
  conflict,
  getIp,
  whereWithDeleted,
} = require('./common');

/**
 * Small CRUD service factory for flat academic catalogs
 * (grade levels, sections, subjects).
 *
 * @param {object} config
 * @param {string} config.model        Prisma delegate name (e.g. 'gradeLevel')
 * @param {string} config.entityType   Audit entity type (e.g. 'GradeLevel')
 * @param {string} config.auditPrefix  Audit action prefix (e.g. 'grade-levels')
 * @param {string} config.label        Human label (e.g. 'Grade level')
 * @param {string} config.codePrefix   Error code prefix (e.g. 'GRADE_LEVEL')
 * @param {string[]} config.fields     Writable fields
 * @param {object} config.orderBy      Default list ordering
 * @param {string[]} config.searchFields
 * @param {(id:number)=>Promise<number>} config.countDependents
 */
function createCatalogService(config) {
  const {
    model,
    entityType,
    auditPrefix,
    label,
    codePrefix,
    fields,
    orderBy,
    searchFields,
    countDependents,
  } = config;

  const delegate = () => prisma[model];
  const NOT_FOUND = `${codePrefix}_NOT_FOUND`;
  const CODE_CONFLICT = `${codePrefix}_CODE_CONFLICT`;

  function serialize(row) {
    const out = { id: row.id };
    for (const field of fields) {
      out[field] = row[field];
    }
    out.deletedAt = row.deletedAt;
    out.createdAt = row.createdAt;
    out.updatedAt = row.updatedAt;
    return out;
  }

  async function findOrThrow(id, { includeDeleted = false } = {}) {
    const row = await delegate().findFirst({
      where: whereWithDeleted({ id }, includeDeleted),
    });

    if (!row) {
      throw notFound(label, NOT_FOUND);
    }

    return row;
  }

  async function assertUniqueCode(code, excludeId = null) {
    const existing = await delegate().findFirst({
      where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });

    if (existing) {
      throw conflict(`${label} with this code already exists.`, CODE_CONFLICT);
    }
  }

  function rethrowUnique(error) {
    if (isUniqueViolation(error)) {
      throw conflict(`${label} with this code already exists.`, CODE_CONFLICT);
    }
    throw error;
  }

  function pick(source) {
    const data = {};
    for (const field of fields) {
      if (source[field] !== undefined) {
        data[field] = source[field];
      }
    }
    return data;
  }

  async function list({ page = 1, limit = 20, q, includeDeleted = false } = {}) {
    const where = whereWithDeleted({}, includeDeleted);

    if (q) {
      where.OR = searchFields.map((field) => ({ [field]: { contains: q } }));
    }

    const [total, items] = await Promise.all([
      delegate().count({ where }),
      delegate().findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map(serialize),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async function getById(id, options = {}) {
    return serialize(await findOrThrow(id, options));
  }

  async function create(payload, admin, requestMeta = {}) {
    await assertUniqueCode(payload.code);

    try {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx[model].create({ data: pick(payload) });

        await recordAudit({
          tx,
          adminId: admin.id,
          action: `${auditPrefix}.create`,
          entityType,
          entityId: created.id,
          metadata: { code: created.code },
          ipAddress: getIp(requestMeta),
        });

        return created;
      });

      return serialize(row);
    } catch (error) {
      return rethrowUnique(error);
    }
  }

  async function update(id, updates, admin, requestMeta = {}) {
    const existing = await findOrThrow(id);
    const data = pick(updates);

    if (data.code && data.code !== existing.code) {
      await assertUniqueCode(data.code, existing.id);
    }

    try {
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx[model].update({ where: { id: existing.id }, data });

        await recordAudit({
          tx,
          adminId: admin.id,
          action: `${auditPrefix}.update`,
          entityType,
          entityId: updated.id,
          metadata: { fields: Object.keys(updates) },
          ipAddress: getIp(requestMeta),
        });

        return updated;
      });

      return serialize(row);
    } catch (error) {
      return rethrowUnique(error);
    }
  }

  async function softDelete(id, admin, requestMeta = {}) {
    const existing = await findOrThrow(id);

    if ((await countDependents(existing.id)) > 0) {
      throw conflict(
        `${label} is in use and cannot be deleted.`,
        `${codePrefix}_HAS_DEPENDENTS`
      );
    }

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx[model].update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      await recordAudit({
        tx,
        adminId: admin.id,
        action: `${auditPrefix}.delete`,
        entityType,
        entityId: updated.id,
        ipAddress: getIp(requestMeta),
      });

      return updated;
    });

    return serialize(row);
  }

  return { list, getById, create, update, softDelete };
}

module.exports = { createCatalogService };
