const contactService = require('../services/contact.service');
const { sendSuccess } = require('../utils/apiResponse');

async function submitContact(req, res) {
  const receipt = await contactService.createMessage(req.validated.body);

  return sendSuccess(res, {
    status: 201,
    message: 'Contact message submitted successfully',
    data: { submission: receipt },
  });
}

module.exports = {
  submitContact,
};
