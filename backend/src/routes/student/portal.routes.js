const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateStudent = require('../../middleware/authenticateStudent');
const validate = require('../../middleware/validate');
const { idParamSchema } = require('../../validators/sms/common');
const { studentAttendanceQuerySchema } = require('../../validators/sms/attendance.schemas');
const {
  studentAssignmentsQuerySchema,
  submitAssignmentBodySchema,
} = require('../../validators/sms/assignment.schemas');
const { studentExamResultsQuerySchema } = require('../../validators/sms/examination.schemas');
const { studentGradebookSummaryQuerySchema } = require('../../validators/sms/gradebook.schemas');
const { studentOwnFeesQuerySchema } = require('../../validators/sms/fee.schemas');
const { studentAnnouncementsQuerySchema } = require('../../validators/sms/announcement.schemas');
const {
  listQuerySchema: learningMaterialListQuerySchema,
} = require('../../validators/sms/learningMaterial.schemas');
const learningMaterialController = require('../../controllers/sms/learningMaterial.controller');
const controller = require('../../controllers/studentPortal.controller');
const { createNotificationRouter } = require('../shared/notifications.routes');
const { createMessagingRouter } = require('../shared/messaging.routes');

const router = express.Router();

router.get('/dashboard/overview', authenticateStudent, asyncHandler(controller.overview));
router.get('/profile', authenticateStudent, asyncHandler(controller.profile));
router.get('/enrollment', authenticateStudent, asyncHandler(controller.enrollment));
router.get('/classes', authenticateStudent, asyncHandler(controller.listClasses));
router.get('/subjects', authenticateStudent, asyncHandler(controller.listSubjects));

router.get(
  '/attendance',
  authenticateStudent,
  validate(studentAttendanceQuerySchema, 'query'),
  asyncHandler(controller.listAttendance)
);
router.get(
  '/assignments',
  authenticateStudent,
  validate(studentAssignmentsQuerySchema, 'query'),
  asyncHandler(controller.listAssignments)
);
router.post(
  '/assignments/:id/submit',
  authenticateStudent,
  validate(idParamSchema, 'params'),
  validate(submitAssignmentBodySchema, 'body'),
  asyncHandler(controller.submitAssignment)
);
router.get(
  '/exam-results',
  authenticateStudent,
  validate(studentExamResultsQuerySchema, 'query'),
  asyncHandler(controller.listExamResults)
);
router.get(
  '/gradebook/summary',
  authenticateStudent,
  validate(studentGradebookSummaryQuerySchema, 'query'),
  asyncHandler(controller.getGradebookSummary)
);
router.get(
  '/fees',
  authenticateStudent,
  validate(studentOwnFeesQuerySchema, 'query'),
  asyncHandler(controller.listFees)
);
router.get(
  '/announcements',
  authenticateStudent,
  validate(studentAnnouncementsQuerySchema, 'query'),
  asyncHandler(controller.listAnnouncements)
);

router.get('/timetable', authenticateStudent, asyncHandler(controller.listTimetable));

router.get(
  '/learning-materials',
  authenticateStudent,
  validate(learningMaterialListQuerySchema, 'query'),
  asyncHandler(learningMaterialController.studentList)
);
router.get(
  '/learning-materials/:id/download',
  authenticateStudent,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.studentDownload)
);
router.get(
  '/learning-materials/:id',
  authenticateStudent,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.studentGet)
);

router.use('/notifications', createNotificationRouter(authenticateStudent));
router.use('/messages', createMessagingRouter(authenticateStudent));

module.exports = router;
