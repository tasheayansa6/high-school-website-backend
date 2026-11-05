const newsletterService = require('../services/newsletter.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listSubscribers(req, res) {
  const result = await newsletterService.listSubscribers(req.validated.query);

  return sendSuccess(res, {
    message: 'Newsletter subscribers retrieved',
    data: result,
  });
}

async function getSubscriber(req, res) {
  const subscriber = await newsletterService.getSubscriberById(req.validated.params.id);

  return sendSuccess(res, {
    message: 'Newsletter subscriber retrieved',
    data: { subscriber },
  });
}

async function updateStatus(req, res) {
  const subscriber = await newsletterService.updateSubscriberStatus(
    req.validated.params.id,
    req.validated.body.status,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Newsletter subscriber status updated',
    data: { subscriber },
  });
}

async function deleteSubscriber(req, res) {
  const subscriber = await newsletterService.softDeleteSubscriber(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Newsletter subscriber deleted',
    data: { subscriber },
  });
}

async function restoreSubscriber(req, res) {
  const subscriber = await newsletterService.restoreSubscriber(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Newsletter subscriber restored',
    data: { subscriber },
  });
}

module.exports = {
  listSubscribers,
  getSubscriber,
  updateStatus,
  deleteSubscriber,
  restoreSubscriber,
};
