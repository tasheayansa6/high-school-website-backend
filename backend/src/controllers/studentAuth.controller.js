const studentAuthService = require('../services/studentAuth.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function login(req, res) {
  const result = await studentAuthService.login(req.validated.body, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
}

async function me(req, res) {
  const student = await studentAuthService.getProfile(req.student.id);

  return sendSuccess(res, {
    message: 'Student profile retrieved',
    data: { student },
  });
}

async function logout(req, res) {
  await studentAuthService.logout(req.student.id, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Logout successful. Existing access tokens for this account are no longer valid.',
    data: null,
  });
}

module.exports = {
  login,
  me,
  logout,
};
