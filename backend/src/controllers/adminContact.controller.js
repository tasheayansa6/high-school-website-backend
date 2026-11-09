const contactService = require('../services/contact.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listMessages(req, res) {
  const result = await contactService.listMessages(req.validated.query);
  return sendSuccess(res, {
    message: 'Contact messages retrieved',
    data: result,
  });
}

async function getMessage(req, res) {
  const message = await contactService.getMessageById(req.validated.params.id);
  return sendSuccess(res, {
    message: 'Contact message retrieved',
    data: { message },
  });
}

async function updateStatus(req, res) {
  const message = await contactService.updateStatus(
    req.validated.params.id,
    req.validated.body.status,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Contact message status updated',
    data: { message },
  });
}

async function deleteMessage(req, res) {
  const message = await contactService.archiveMessage(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Contact message archived',
    data: { message },
  });
}

async function restoreMessage(req, res) {
  const message = await contactService.restoreMessage(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Contact message restored',
    data: { message },
  });
}

module.exports = {
  listMessages,
  getMessage,
  updateStatus,
  deleteMessage,
  restoreMessage,
};
