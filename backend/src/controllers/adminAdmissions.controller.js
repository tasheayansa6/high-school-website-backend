const admissionsService = require('../services/admissions.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function listInquiries(req, res) {
  const result = await admissionsService.listInquiries(req.validated.query);

  return sendSuccess(res, {
    message: 'Admission inquiries retrieved',
    data: result,
  });
}

async function getInquiry(req, res) {
  const inquiry = await admissionsService.getInquiryById(req.validated.params.id);

  return sendSuccess(res, {
    message: 'Admission inquiry retrieved',
    data: { inquiry },
  });
}

async function updateStatus(req, res) {
  const inquiry = await admissionsService.updateStatus(
    req.validated.params.id,
    req.validated.body.status,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Admission inquiry status updated',
    data: { inquiry },
  });
}

async function deleteInquiry(req, res) {
  const inquiry = await admissionsService.softDeleteInquiry(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Admission inquiry deleted',
    data: { inquiry },
  });
}

async function restoreInquiry(req, res) {
  const inquiry = await admissionsService.restoreInquiry(
    req.validated.params.id,
    req.admin,
    getRequestMeta(req)
  );

  return sendSuccess(res, {
    message: 'Admission inquiry restored',
    data: { inquiry },
  });
}

module.exports = {
  listInquiries,
  getInquiry,
  updateStatus,
  deleteInquiry,
  restoreInquiry,
};
