const announcementService = require('../../services/sms/announcement.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function adminActor(req) {
  return { adminId: req.admin.id };
}

async function listAnnouncements(req, res) {
  const result = await announcementService.listAnnouncements(req.validated.query);
  return sendSuccess(res, { message: 'Announcements retrieved', data: result });
}

async function getAnnouncement(req, res) {
  const announcement = await announcementService.getAnnouncementById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Announcement retrieved', data: { announcement } });
}

async function createAnnouncement(req, res) {
  const announcement = await announcementService.createAnnouncement(req.validated.body, req.admin, getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Announcement created', data: { announcement } });
}

async function updateAnnouncement(req, res) {
  const announcement = await announcementService.updateAnnouncement(
    req.validated.params.id,
    req.validated.body,
    req.admin,
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Announcement updated', data: { announcement } });
}

async function publishAnnouncement(req, res) {
  const announcement = await announcementService.publishAnnouncement(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, { message: 'Announcement published', data: { announcement } });
}

async function deleteAnnouncement(req, res) {
  const announcement = await announcementService.softDeleteAnnouncement(req.validated.params.id, req.admin, getRequestMeta(req));
  return sendSuccess(res, { message: 'Announcement deleted', data: { announcement } });
}

module.exports = {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
};
