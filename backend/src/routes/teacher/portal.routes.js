const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const authenticateTeacher = require('../../middleware/authenticateTeacher');
const { idParamSchema } = require('../../validators/sms/common');
const { teacherStudentsQuerySchema } = require('../../validators/sms/teacherPortal.schemas');
const controller = require('../../controllers/teacherPortal.controller');
const opsController = require('../../controllers/teacherOps.controller');
const {
  attendanceListQuerySchema,
  upsertAttendanceBodySchema,
  bulkAttendanceBodySchema,
} = require('../../validators/sms/attendance.schemas');
const {
  assignmentListQuerySchema,
  teacherCreateAssignmentBodySchema,
  updateAssignmentBodySchema,
  submissionListQuerySchema,
  gradeSubmissionBodySchema,
  assignmentSubmissionParamsSchema,
} = require('../../validators/sms/assignment.schemas');
const {
  examinationListQuerySchema,
  createExaminationBodySchema,
  updateExaminationBodySchema,
  examResultListQuerySchema,
  upsertExamResultsBodySchema,
} = require('../../validators/sms/examination.schemas');
const {
  teacherGradebookListQuerySchema,
  classSubjectGradebookQuerySchema,
} = require('../../validators/sms/gradebook.schemas');
const { studentAnnouncementsQuerySchema } = require('../../validators/sms/announcement.schemas');
const { teacherTimetableQuerySchema } = require('../../validators/sms/timetable.schemas');
const {
  listQuerySchema: learningMaterialListQuerySchema,
  createBodySchema: learningMaterialCreateBodySchema,
  updateBodySchema: learningMaterialUpdateBodySchema,
} = require('../../validators/sms/learningMaterial.schemas');
const learningMaterialUpload = require('../../middleware/learningMaterialUpload');
const learningMaterialController = require('../../controllers/sms/learningMaterial.controller');
const { createNotificationRouter } = require('../shared/notifications.routes');
const { createMessagingRouter } = require('../shared/messaging.routes');

const router = express.Router();

router.get('/dashboard/overview', authenticateTeacher, asyncHandler(controller.overview));
router.get('/profile', authenticateTeacher, asyncHandler(controller.profile));
router.get('/classes', authenticateTeacher, asyncHandler(controller.listClasses));
router.get('/classes/:id', authenticateTeacher, validate(idParamSchema, 'params'), asyncHandler(controller.getClass));
router.get('/subjects', authenticateTeacher, asyncHandler(controller.listSubjects));
router.get(
  '/students',
  authenticateTeacher,
  validate(teacherStudentsQuerySchema, 'query'),
  asyncHandler(controller.listStudents)
);

// ---- Attendance (classes the teacher teaches) ----
router.get(
  '/attendance',
  authenticateTeacher,
  validate(attendanceListQuerySchema, 'query'),
  asyncHandler(opsController.listAttendance)
);
router.post(
  '/attendance',
  authenticateTeacher,
  validate(upsertAttendanceBodySchema, 'body'),
  asyncHandler(opsController.upsertAttendance)
);
router.post(
  '/attendance/bulk',
  authenticateTeacher,
  validate(bulkAttendanceBodySchema, 'body'),
  asyncHandler(opsController.bulkUpsertAttendance)
);

// ---- Assignments (own teacherId) ----
router.get(
  '/assignments',
  authenticateTeacher,
  validate(assignmentListQuerySchema, 'query'),
  asyncHandler(opsController.listAssignments)
);
router.post(
  '/assignments',
  authenticateTeacher,
  validate(teacherCreateAssignmentBodySchema, 'body'),
  asyncHandler(opsController.createAssignment)
);
router.get(
  '/assignments/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(opsController.getAssignment)
);
router.patch(
  '/assignments/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(updateAssignmentBodySchema, 'body'),
  asyncHandler(opsController.updateAssignment)
);
router.delete(
  '/assignments/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(opsController.deleteAssignment)
);
router.get(
  '/assignments/:id/submissions',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(submissionListQuerySchema, 'query'),
  asyncHandler(opsController.listSubmissions)
);
router.patch(
  '/assignments/:id/submissions/:submissionId/grade',
  authenticateTeacher,
  validate(assignmentSubmissionParamsSchema, 'params'),
  validate(gradeSubmissionBodySchema, 'body'),
  asyncHandler(opsController.gradeSubmission)
);

// ---- Gradebook (assigned class + subject only) ----
router.get(
  '/gradebook',
  authenticateTeacher,
  validate(teacherGradebookListQuerySchema, 'query'),
  asyncHandler(opsController.listGradebooks)
);
router.get(
  '/gradebook/class-subject',
  authenticateTeacher,
  validate(classSubjectGradebookQuerySchema, 'query'),
  asyncHandler(opsController.getClassSubjectGradebook)
);

// ---- Exams / results (assigned class + subject) ----
router.get(
  '/examinations',
  authenticateTeacher,
  validate(examinationListQuerySchema, 'query'),
  asyncHandler(opsController.listExaminations)
);
router.post(
  '/examinations',
  authenticateTeacher,
  validate(createExaminationBodySchema, 'body'),
  asyncHandler(opsController.createExamination)
);
router.patch(
  '/examinations/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(updateExaminationBodySchema, 'body'),
  asyncHandler(opsController.updateExamination)
);
router.post(
  '/examinations/:id/submit',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(opsController.submitExamMarks)
);
router.get(
  '/examinations/:id/results',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(examResultListQuerySchema, 'query'),
  asyncHandler(opsController.listExamResults)
);
router.put(
  '/examinations/:id/results',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(upsertExamResultsBodySchema, 'body'),
  asyncHandler(opsController.upsertExamResults)
);
router.post(
  '/examinations/:id/results',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(upsertExamResultsBodySchema, 'body'),
  asyncHandler(opsController.upsertExamResults)
);

// ---- Announcements (ALL / TEACHERS / assigned CLASS) ----
router.get(
  '/announcements',
  authenticateTeacher,
  validate(studentAnnouncementsQuerySchema, 'query'),
  asyncHandler(controller.listAnnouncements)
);

// ---- Timetable (own published slots only) ----
router.get(
  '/timetable',
  authenticateTeacher,
  validate(teacherTimetableQuerySchema, 'query'),
  asyncHandler(controller.listTimetable)
);

// ---- Learning materials (own class/subject assignments only) ----
router.get(
  '/learning-materials',
  authenticateTeacher,
  validate(learningMaterialListQuerySchema, 'query'),
  asyncHandler(learningMaterialController.teacherList)
);
router.post(
  '/learning-materials',
  authenticateTeacher,
  learningMaterialUpload,
  validate(learningMaterialCreateBodySchema, 'body'),
  asyncHandler(learningMaterialController.teacherCreate)
);
router.get(
  '/learning-materials/:id/download',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.teacherDownload)
);
router.get(
  '/learning-materials/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.teacherGet)
);
router.patch(
  '/learning-materials/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  validate(learningMaterialUpdateBodySchema, 'body'),
  asyncHandler(learningMaterialController.teacherUpdate)
);
router.post(
  '/learning-materials/:id/file',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  learningMaterialUpload,
  asyncHandler(learningMaterialController.teacherReplaceFile)
);
router.post(
  '/learning-materials/:id/publish',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.teacherPublish)
);
router.post(
  '/learning-materials/:id/unpublish',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.teacherUnpublish)
);
router.delete(
  '/learning-materials/:id',
  authenticateTeacher,
  validate(idParamSchema, 'params'),
  asyncHandler(learningMaterialController.teacherDelete)
);

router.use('/notifications', createNotificationRouter(authenticateTeacher));
router.use('/messages', createMessagingRouter(authenticateTeacher));

module.exports = router;
