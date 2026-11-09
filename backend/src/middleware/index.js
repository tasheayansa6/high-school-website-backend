const asyncHandler = require('./asyncHandler');
const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const requestLogger = require('./requestLogger');
const validate = require('./validate');
const apiRateLimiter = require('./rateLimiter');
const loginRateLimiter = require('./loginRateLimiter');
const contactRateLimiter = require('./contactRateLimiter');
const newsletterRateLimiter = require('./newsletterRateLimiter');
const admissionsRateLimiter = require('./admissionsRateLimiter');
const mediaRateLimiter = require('./mediaRateLimiter');
const mediaUploadSingle = require('./mediaUpload');
const authenticate = require('./authenticate');
const authenticateTeacher = require('./authenticateTeacher');
const authenticateStudent = require('./authenticateStudent');
const { authorize, authorizeAny, requireRoles } = require('./authorize');

module.exports = {
  asyncHandler,
  errorHandler,
  notFound,
  requestLogger,
  validate,
  apiRateLimiter,
  loginRateLimiter,
  contactRateLimiter,
  newsletterRateLimiter,
  admissionsRateLimiter,
  mediaRateLimiter,
  mediaUploadSingle,
  authenticate,
  authenticateTeacher,
  authenticateStudent,
  authorize,
  authorizeAny,
  requireRoles,
};
