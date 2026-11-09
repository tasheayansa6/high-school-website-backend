const admissionsService = require('../services/admissions.service');
const { sendSuccess } = require('../utils/apiResponse');

async function submitInquiry(req, res) {
  const submission = await admissionsService.createInquiry(req.validated.body);

  return sendSuccess(res, {
    status: 201,
    message: 'Admission inquiry submitted successfully',
    data: { submission },
  });
}

module.exports = {
  submitInquiry,
};
