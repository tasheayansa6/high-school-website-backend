const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');

async function login(req, res) {
  const credentials = req.validated.body;
  const result = await authService.login(credentials);

  return sendSuccess(res, {
    message: 'Login successful',
    data: result,
  });
}

async function me(req, res) {
  const admin = await authService.getProfile(req.admin.id);

  return sendSuccess(res, {
    message: 'Administrator profile retrieved',
    data: { admin },
  });
}

async function logout(req, res) {
  await authService.logout(req.admin.id);

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
