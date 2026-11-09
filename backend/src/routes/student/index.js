const express = require('express');
const authRoutes = require('./auth.routes');
const portalRoutes = require('./portal.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/', portalRoutes);

module.exports = router;
