const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticateTeacher = require('../../middleware/authenticateTeacher');
const loginRateLimiter = require('../../middleware/loginRateLimiter');
const { teacherLoginBodySchema } = require('../../validators/sms/auth.schemas');
const teacherAuthController = require('../../controllers/teacherAuth.controller');

const router = express.Router();

router.post(
  '/login',
  loginRateLimiter,
  validate(teacherLoginBodySchema, 'body'),
  asyncHandler(teacherAuthController.login)
);

router.get('/me', authenticateTeacher, asyncHandler(teacherAuthController.me));

router.post('/logout', authenticateTeacher, asyncHandler(teacherAuthController.logout));

module.exports = router;
