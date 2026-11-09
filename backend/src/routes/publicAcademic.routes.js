const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/publicAcademic.controller');

const router = express.Router();

router.get('/overview', asyncHandler(controller.overview));

module.exports = router;
