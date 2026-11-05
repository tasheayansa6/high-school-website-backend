const { prisma } = require('../config/database');

/**
 * Persist an administrator activity record.
 * Avoid logging secrets or full HTML bodies.
 * Pass `tx` when calling inside prisma.$transaction.
 */
async function recordAudit({
  adminId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  tx,
}) {
  const client = tx || prisma;

  return client.auditLog.create({
    data: {
      adminId: adminId || null,
      action,
      entityType: entityType || null,
      entityId: entityId != null ? String(entityId) : null,
      metadata: metadata || undefined,
      ipAddress: ipAddress || null,
    },
  });
}

module.exports = {
  recordAudit,
};
