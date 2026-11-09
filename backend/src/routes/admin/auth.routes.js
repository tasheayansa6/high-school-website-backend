const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const loginRateLimiter = require('../../middleware/loginRateLimiter');
const { loginBodySchema } = require('../../validators/auth.schemas');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

router.post(
  '/login',
  loginRateLimiter,
  validate(loginBodySchema, 'body'),
  asyncHandler(authController.login)
);

router.get('/me', authenticate, asyncHandler(authController.me));

router.post('/logout', authenticate, asyncHandler(authController.logout));

module.exports = router;
