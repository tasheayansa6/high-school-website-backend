const express = require('express');
const authRoutes = require('./auth.routes');
const accessRoutes = require('./access.routes');
const pagesRoutes = require('./pages.routes');
const blogRoutes = require('./blog.routes');
const contactRoutes = require('./contact.routes');
const newsletterRoutes = require('./newsletter.routes');
const admissionsRoutes = require('./admissions.routes');
const eventsRoutes = require('./events.routes');
const mediaRoutes = require('./media.routes');
const settingsRoutes = require('./settings.routes');
const dashboardRoutes = require('./dashboard.routes');
const smsRoutes = require('./sms');
const authenticate = require('../../middleware/authenticate');
const { createNotificationRouter } = require('../shared/notifications.routes');
const { createMessagingRouter } = require('../shared/messaging.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/access', accessRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pages', pagesRoutes);
router.use('/blog', blogRoutes);
router.use('/events', eventsRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingsRoutes);
router.use('/contact-messages', contactRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/admissions', admissionsRoutes);
router.use('/sms', smsRoutes);
router.use('/notifications', createNotificationRouter(authenticate));
router.use('/messages', createMessagingRouter(authenticate));

module.exports = router;
