const teacherAuthService = require('../services/teacherAuth.service');
const { sendSuccess } = require('../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

async function login(req, res) {
  const result = await teacherAuthService.login(req.validated.body, getRequestMeta(req));

  return sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
}

async function me(req, res) {
  const teacher = await teacherAuthService.getProfile(req.teacher.id);

  return sendSuccess(res, {
    message: 'Teacher profile retrieved',
    data: { teacher },
  });
}

async function logout(req, res) {
  await teacherAuthService.logout(req.teacher.id, getRequestMeta(req));

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
