const messagingService = require('../../services/sms/messaging.service');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/apiResponse');

function actorFromReq(req) {
  if (req.admin?.id) return { type: 'ADMIN', id: req.admin.id };
  if (req.teacher?.id) return { type: 'TEACHER', id: req.teacher.id };
  if (req.student?.id) return { type: 'STUDENT', id: req.student.id };
  throw new AppError('Authentication required.', 401, { code: 'UNAUTHORIZED' });
}

function getRequestMeta(req) {
  return { ipAddress: req.ip || req.headers['x-forwarded-for'] || null };
}

async function listConversations(req, res) {
  const actor = actorFromReq(req);
  const data = await messagingService.listConversations(actor, req.validated.query);
  return sendSuccess(res, { message: 'Conversations retrieved', data });
}

async function unread(req, res) {
  const actor = actorFromReq(req);
  const data = await messagingService.unreadTotal(actor);
  return sendSuccess(res, { message: 'Unread message count retrieved', data });
}

async function contacts(req, res) {
  const actor = actorFromReq(req);
  const data = await messagingService.listEligibleContacts(actor, req.validated.query);
  return sendSuccess(res, { message: 'Eligible contacts retrieved', data });
}

async function start(req, res) {
  const actor = actorFromReq(req);
  const conversation = await messagingService.startConversation(
    actor,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Conversation ready',
    data: { conversation },
  });
}

async function getOne(req, res) {
  const actor = actorFromReq(req);
  const conversation = await messagingService.getConversation(actor, req.validated.params.id);
  return sendSuccess(res, { message: 'Conversation retrieved', data: { conversation } });
}

async function listMessages(req, res) {
  const actor = actorFromReq(req);
  const data = await messagingService.listMessages(
    actor,
    req.validated.params.id,
    req.validated.query
  );
  return sendSuccess(res, { message: 'Messages retrieved', data });
}

async function send(req, res) {
  const actor = actorFromReq(req);
  const message = await messagingService.sendMessage(
    actor,
    req.validated.params.id,
    req.validated.body,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Message sent',
    data: { message },
  });
}

async function markRead(req, res) {
  const actor = actorFromReq(req);
  const data = await messagingService.markConversationRead(actor, req.validated.params.id);
  return sendSuccess(res, { message: 'Conversation marked as read', data });
}

module.exports = {
  listConversations,
  unread,
  contacts,
  start,
  getOne,
  listMessages,
  send,
  markRead,
};
