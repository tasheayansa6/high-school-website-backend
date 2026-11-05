const eventService = require('../services/event.service');
const { sendSuccess } = require('../utils/apiResponse');

async function listPublicEvents(req, res) {
  const result = await eventService.listPublicEvents(req.validated.query);

  return sendSuccess(res, {
    message: 'Events retrieved',
    data: result,
  });
}

async function getPublicEventBySlug(req, res) {
  const event = await eventService.getPublicEventBySlug(req.validated.params.slug);

  return sendSuccess(res, {
    message: 'Event retrieved',
    data: { event },
  });
}

module.exports = {
  listPublicEvents,
  getPublicEventBySlug,
};
