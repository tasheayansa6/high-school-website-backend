const newsletterService = require('../services/newsletter.service');
const { sendSuccess } = require('../utils/apiResponse');

async function subscribe(req, res) {
  const result = await newsletterService.subscribe(req.validated.body.email);

  return sendSuccess(res, {
    status: 202,
    message: result.message,
    data: null,
  });
}

async function confirm(req, res) {
  const result = await newsletterService.confirmSubscription(req.validated.query.token);

  return sendSuccess(res, {
    message: result.message,
    data: null,
  });
}

async function unsubscribe(req, res) {
  const result = await newsletterService.unsubscribe(req.validated.body.token);

  return sendSuccess(res, {
    message: result.message,
    data: null,
  });
}

module.exports = {
  subscribe,
  confirm,
  unsubscribe,
};
