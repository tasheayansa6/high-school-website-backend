const { sendSuccess } = require('../utils/apiResponse');

function validateExample(req, res) {
  return sendSuccess(res, {
    message: 'Validation passed',
    data: req.validated.body,
  });
}

module.exports = {
  validateExample,
};
