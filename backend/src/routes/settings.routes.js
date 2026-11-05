const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.get('/public', asyncHandler(settingsController.getPublicSettings));

module.exports = router;
