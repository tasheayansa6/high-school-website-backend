/**
 * Standard success response for the React frontend.
 * Shape: { success: true, message, data }
 */
function sendSuccess(res, { status = 200, message = 'Success', data = null } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

/**
 * Standard error response.
 * Shape: { success: false, message, code?, errors?, data? }
 */
function sendError(
  res,
  { status = 500, message = 'Internal server error', code, errors, data } = {}
) {
  const payload = {
    success: false,
    message,
  };

  if (code) {
    payload.code = code;
  }

  if (errors && errors.length > 0) {
    payload.errors = errors;
  }

  if (typeof data !== 'undefined') {
    payload.data = data;
  }

  return res.status(status).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
