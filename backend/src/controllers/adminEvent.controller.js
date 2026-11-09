const eventService = require('../services/event.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listEvents(req, res) {
  const result = await eventService.listAdminEvents(req.validated.query);
  return sendSuccess(res, { message: 'Events retrieved', data: result });
}

async function getEvent(req, res) {
  const event = await eventService.getAdminEventById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Event retrieved', data: { event } });
}

async function createEvent(req, res) {
  const event = await eventService.createEvent(
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Event created',
    data: { event },
  });
}

async function updateEvent(req, res) {
  const event = await eventService.updateEvent(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event updated', data: { event } });
}

async function publishEvent(req, res) {
  const event = await eventService.publishEvent(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event published', data: { event } });
}

async function unpublishEvent(req, res) {
  const event = await eventService.unpublishEvent(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event unpublished', data: { event } });
}

async function cancelEvent(req, res) {
  const event = await eventService.cancelEvent(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event cancelled', data: { event } });
}

async function deleteEvent(req, res) {
  const event = await eventService.softDeleteEvent(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event deleted', data: { event } });
}

async function restoreEvent(req, res) {
  const event = await eventService.restoreEvent(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Event restored', data: { event } });
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  deleteEvent,
  restoreEvent,
};
