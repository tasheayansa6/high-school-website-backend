const express = require('express');
const healthRoutes = require('./health.routes');
const systemRoutes = require('./system.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/system', systemRoutes);

module.exports = router;
