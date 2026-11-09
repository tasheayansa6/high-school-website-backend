const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticateStudent = require('../../middleware/authenticateStudent');
const loginRateLimiter = require('../../middleware/loginRateLimiter');
const { studentLoginBodySchema } = require('../../validators/sms/auth.schemas');
const studentAuthController = require('../../controllers/studentAuth.controller');

const router = express.Router();

router.post(
  '/login',
  loginRateLimiter,
  validate(studentLoginBodySchema, 'body'),
  asyncHandler(studentAuthController.login)
);

router.get('/me', authenticateStudent, asyncHandler(studentAuthController.me));

router.post('/logout', authenticateStudent, asyncHandler(studentAuthController.logout));

module.exports = router;
