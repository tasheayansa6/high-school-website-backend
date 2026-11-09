const { prisma } = require('../config/database');

/**
 * Persist an activity record for admin / teacher / student actors.
 * Avoid logging secrets or full HTML bodies.
 * Pass `tx` when calling inside prisma.$transaction.
 */
async function recordAudit({
  adminId,
  teacherId,
  studentId,
  actorType,
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  tx,
}) {
  const client = tx || prisma;

  let resolvedActorType = actorType || null;
  let resolvedActorId = actorId != null ? Number(actorId) : null;

  if (!resolvedActorType) {
    if (adminId) {
      resolvedActorType = 'ADMIN';
      resolvedActorId = Number(adminId);
    } else if (teacherId) {
      resolvedActorType = 'TEACHER';
      resolvedActorId = Number(teacherId);
    } else if (studentId) {
      resolvedActorType = 'STUDENT';
      resolvedActorId = Number(studentId);
    }
  }

  return client.auditLog.create({
    data: {
      adminId: adminId || null,
      teacherId: teacherId || null,
      studentId: studentId || null,
      actorType: resolvedActorType,
      actorId: resolvedActorId,
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
