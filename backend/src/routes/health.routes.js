const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  getHealth,
  getLiveness,
  getReadiness,
} = require('../controllers/health.controller');

const router = express.Router();

router.get('/live', asyncHandler(getLiveness));
router.get('/ready', asyncHandler(getReadiness));
/** Alias of readiness for existing Railway healthcheckPath=/api/v1/health */
router.get('/', asyncHandler(getHealth));

module.exports = router;
