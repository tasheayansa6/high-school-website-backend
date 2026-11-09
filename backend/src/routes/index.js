const express = require('express');
const healthRoutes = require('./health.routes');
const systemRoutes = require('./system.routes');
const pagesRoutes = require('./pages.routes');
const blogRoutes = require('./blog.routes');
const contactRoutes = require('./contact.routes');
const newsletterRoutes = require('./newsletter.routes');
const admissionsRoutes = require('./admissions.routes');
const eventsRoutes = require('./events.routes');
const mediaRoutes = require('./media.routes');
const settingsRoutes = require('./settings.routes');
const publicAcademicRoutes = require('./publicAcademic.routes');
const adminRoutes = require('./admin');
const teacherRoutes = require('./teacher');
const studentRoutes = require('./student');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/system', systemRoutes);
router.use('/pages', pagesRoutes);
router.use('/blog', blogRoutes);
router.use('/contact', contactRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/admissions', admissionsRoutes);
router.use('/events', eventsRoutes);
router.use('/media', mediaRoutes);
router.use('/settings', settingsRoutes);
router.use('/academic', publicAcademicRoutes);
router.use('/admin', adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

module.exports = router;
