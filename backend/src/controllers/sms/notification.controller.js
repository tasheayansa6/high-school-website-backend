const notificationService = require('../../services/sms/notification.service');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

function actorFromReq(req) {
  if (req.admin?.id) return { type: 'ADMIN', id: req.admin.id };
  if (req.teacher?.id) return { type: 'TEACHER', id: req.teacher.id };
  if (req.student?.id) return { type: 'STUDENT', id: req.student.id };
  throw new AppError('Authentication required.', 401, { code: 'UNAUTHORIZED' });
}

async function list(req, res) {
  const actor = actorFromReq(req);
  const data = await notificationService.listForRecipient(actor.type, actor.id, req.validated.query);
  return sendSuccess(res, { message: 'Notifications retrieved', data });
}

async function unread(req, res) {
  const actor = actorFromReq(req);
  const data = await notificationService.unreadCount(actor.type, actor.id);
  return sendSuccess(res, { message: 'Unread notification count retrieved', data });
}

async function getOne(req, res) {
  const actor = actorFromReq(req);
  const notification = await notificationService.getById(actor.type, actor.id, req.validated.params.id);
  return sendSuccess(res, { message: 'Notification retrieved', data: { notification } });
}

async function markRead(req, res) {
  const actor = actorFromReq(req);
  const notification = await notificationService.markRead(
    actor.type,
    actor.id,
    req.validated.params.id
  );
  return sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
}

async function markAllRead(req, res) {
  const actor = actorFromReq(req);
  const data = await notificationService.markAllRead(actor.type, actor.id);
  return sendSuccess(res, { message: 'All notifications marked as read', data });
}

async function archive(req, res) {
  const actor = actorFromReq(req);
  const notification = await notificationService.archive(
    actor.type,
    actor.id,
    req.validated.params.id
  );
  return sendSuccess(res, { message: 'Notification archived', data: { notification } });
}

async function remove(req, res) {
  const actor = actorFromReq(req);
  const notification = await notificationService.softDelete(
    actor.type,
    actor.id,
    req.validated.params.id
  );
  return sendSuccess(res, { message: 'Notification deleted', data: { notification } });
}

module.exports = {
  list,
  unread,
  getOne,
  markRead,
  markAllRead,
  archive,
  remove,
};
