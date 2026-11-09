/**
 * Post-commit notification emitters for successful SMS business events.
 * Failures are logged and swallowed so notification issues never roll back
 * completed academic operations.
 */
const notificationService = require('./notification.service');

function logNotifyError(event, error) {
  // eslint-disable-next-line no-console
  console.error(`[notifications] ${event} failed:`, error?.message || error);
}

async function safeEmit(event, fn) {
  try {
    return await fn();
  } catch (error) {
    logNotifyError(event, error);
    return null;
  }
}

async function notifyAssignmentPublished(assignment) {
  if (!assignment?.isPublished || !assignment.id) return null;
  return safeEmit('assignment.published', async () => {
    const studentIds = await notificationService.listActiveStudentIdsInClass(assignment.classOfferingId);
    return notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: studentIds,
      title: 'New assignment published',
      message: `A new assignment "${assignment.title}" is available for your class.`,
      category: 'ACADEMIC',
      dedupeKey: `assignment.published:${assignment.id}`,
      entityType: 'Assignment',
      entityId: assignment.id,
      actionPath: '/student/assignments',
    });
  });
}

async function notifyAssignmentSubmitted(assignment, studentId) {
  if (!assignment?.teacherId || !studentId) return null;
  return safeEmit('assignment.submitted', async () =>
    notificationService.createForRecipients({
      recipientType: 'TEACHER',
      recipientIds: [assignment.teacherId],
      title: 'Assignment submitted',
      message: `A student submitted work for "${assignment.title}".`,
      category: 'ACADEMIC',
      dedupeKey: `assignment.submitted:${assignment.id}:${studentId}`,
      entityType: 'Assignment',
      entityId: assignment.id,
      actionPath: `/teacher/assignments`,
    })
  );
}

async function notifyAssignmentGraded(assignment, studentId) {
  if (!assignment?.id || !studentId) return null;
  return safeEmit('assignment.graded', async () =>
    notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [studentId],
      title: 'Assignment feedback available',
      message: `Feedback is available for "${assignment.title}".`,
      category: 'ACADEMIC',
      dedupeKey: `assignment.graded:${assignment.id}:${studentId}`,
      entityType: 'Assignment',
      entityId: assignment.id,
      actionPath: '/student/assignments',
    })
  );
}

async function notifyAttendanceRecorded(record) {
  if (!record?.studentId) return null;
  return safeEmit('attendance.recorded', async () =>
    notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: [record.studentId],
      title: 'Attendance updated',
      message: 'Your attendance record was updated for a class session.',
      category: 'ATTENDANCE',
      dedupeKey: `attendance.recorded:${record.classOfferingId}:${record.studentId}:${String(record.attendanceDate).slice(0, 10)}`,
      entityType: 'AttendanceRecord',
      entityId: record.id,
      actionPath: '/student/attendance',
    })
  );
}

async function notifyExamResultsSubmitted(examination) {
  if (!examination?.id) return null;
  return safeEmit('exam.submitted', async () => {
    const adminIds = await notificationService.listActiveAdminIds();
    return notificationService.createForRecipients({
      recipientType: 'ADMIN',
      recipientIds: adminIds,
      title: 'Results submitted for review',
      message: `Marks for "${examination.name}" were submitted and await review.`,
      category: 'ACADEMIC',
      dedupeKey: `exam.submitted:${examination.id}`,
      entityType: 'Examination',
      entityId: examination.id,
      actionPath: '/admin/gradebook',
    });
  });
}

async function notifyExamResultsPublished(examination) {
  if (!examination?.id || !examination.isPublished) return null;
  return safeEmit('exam.published', async () => {
    const studentIds = await notificationService.listActiveStudentIdsInClass(examination.classOfferingId);
    const tasks = [
      notificationService.createForRecipients({
        recipientType: 'STUDENT',
        recipientIds: studentIds,
        title: 'Results published',
        message: `Results for "${examination.name}" are now available.`,
        category: 'ACADEMIC',
        dedupeKey: `exam.published:${examination.id}`,
        entityType: 'Examination',
        entityId: examination.id,
        actionPath: '/student/gradebook',
      }),
    ];
    const teacherId = examination.submittedById || examination.teacherId;
    if (teacherId) {
      tasks.push(
        notificationService.createForRecipients({
          recipientType: 'TEACHER',
          recipientIds: [teacherId],
          title: 'Results approved',
          message: `Results for "${examination.name}" were approved and published.`,
          category: 'ACADEMIC',
          dedupeKey: `exam.approved:${examination.id}`,
          entityType: 'Examination',
          entityId: examination.id,
          actionPath: '/teacher/gradebook',
        })
      );
    }
    return Promise.all(tasks);
  });
}

async function notifyTimetableAudience(timetable, { title, message, dedupeKey }) {
  if (!timetable?.id || !timetable.classOfferingId) return null;
  const [studentIds, teacherIds] = await Promise.all([
    notificationService.listActiveStudentIdsInClass(timetable.classOfferingId),
    notificationService.listActiveTeacherIdsForClass(timetable.classOfferingId),
  ]);
  const [students, teachers] = await Promise.all([
    notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: studentIds,
      title,
      message,
      category: 'TIMETABLE',
      dedupeKey: `${dedupeKey}:STUDENT`,
      entityType: 'Timetable',
      entityId: timetable.id,
      actionPath: '/student/timetable',
    }),
    notificationService.createForRecipients({
      recipientType: 'TEACHER',
      recipientIds: teacherIds,
      title,
      message,
      category: 'TIMETABLE',
      dedupeKey: `${dedupeKey}:TEACHER`,
      entityType: 'Timetable',
      entityId: timetable.id,
      actionPath: '/teacher/timetable',
    }),
  ]);
  return { students, teachers };
}

async function notifyTimetablePublished(timetable) {
  if (!timetable?.id || !timetable.isPublished) return null;
  return safeEmit('timetable.published', () =>
    notifyTimetableAudience(timetable, {
      title: 'Timetable published',
      message: 'An updated class timetable has been published.',
      dedupeKey: `timetable.published:${timetable.id}:v:${timetable.updatedAt?.getTime?.() || Date.now()}`,
    })
  );
}

async function notifyTimetableChanged(timetable, entryId) {
  if (!timetable?.id || !timetable.isPublished) return null;
  return safeEmit('timetable.changed', () =>
    notifyTimetableAudience(timetable, {
      title: 'Timetable changed',
      message: 'A published class timetable was updated.',
      dedupeKey: `timetable.changed:${timetable.id}:entry:${entryId}:${Date.now()}`,
    })
  );
}

async function notifyTimetableEntryCancelled(timetable, entryId) {
  if (!timetable?.id || !timetable.isPublished) return null;
  return safeEmit('timetable.cancelled', () =>
    notifyTimetableAudience(timetable, {
      title: 'Timetable entry cancelled',
      message: 'A period on a published class timetable was cancelled.',
      dedupeKey: `timetable.cancelled:${timetable.id}:entry:${entryId}`,
    })
  );
}

async function notifyLearningMaterialPublished(material) {
  if (!material?.id || !material.isPublished) return null;
  return safeEmit('learning-material.published', async () => {
    const studentIds = await notificationService.listActiveStudentIdsInClass(material.classOfferingId);
    return notificationService.createForRecipients({
      recipientType: 'STUDENT',
      recipientIds: studentIds,
      title: 'New learning material',
      message: `A new resource "${material.title}" was published for your class.`,
      category: 'LEARNING_MATERIAL',
      dedupeKey: `learning-material.published:${material.id}`,
      entityType: 'LearningMaterial',
      entityId: material.id,
      actionPath: '/student/learning-materials',
    });
  });
}

async function notifyAnnouncementPublished(announcement) {
  if (!announcement?.id || !announcement.isPublished) return null;
  return safeEmit('announcement.published', async () => {
    const audience = announcement.audience || 'ALL';
    const tasks = [];

    if (audience === 'ALL' || audience === 'STUDENTS' || audience === 'CLASS') {
      let studentIds = [];
      if (audience === 'CLASS' && announcement.classOfferingId) {
        studentIds = await notificationService.listActiveStudentIdsInClass(announcement.classOfferingId);
      } else if (audience === 'ALL' || audience === 'STUDENTS') {
        const { prisma } = require('../../config/database');
        const rows = await prisma.student.findMany({
          where: { deletedAt: null, isActive: true },
          select: { id: true },
        });
        studentIds = rows.map((r) => r.id);
      }
      tasks.push(
        notificationService.createForRecipients({
          recipientType: 'STUDENT',
          recipientIds: studentIds,
          title: 'New announcement',
          message: `Announcement: "${announcement.title}".`,
          category: 'ANNOUNCEMENT',
          dedupeKey: `announcement.published:${announcement.id}`,
          entityType: 'Announcement',
          entityId: announcement.id,
          actionPath: '/student/announcements',
        })
      );
    }

    if (audience === 'ALL' || audience === 'TEACHERS') {
      const { prisma } = require('../../config/database');
      const rows = await prisma.teacher.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true },
      });
      tasks.push(
        notificationService.createForRecipients({
          recipientType: 'TEACHER',
          recipientIds: rows.map((r) => r.id),
          title: 'New announcement',
          message: `Announcement: "${announcement.title}".`,
          category: 'ANNOUNCEMENT',
          dedupeKey: `announcement.published:${announcement.id}`,
          entityType: 'Announcement',
          entityId: announcement.id,
          actionPath: '/teacher/announcements',
        })
      );
    }

    if (audience === 'CLASS' && announcement.classOfferingId) {
      const teacherIds = await notificationService.listActiveTeacherIdsForClass(
        announcement.classOfferingId
      );
      tasks.push(
        notificationService.createForRecipients({
          recipientType: 'TEACHER',
          recipientIds: teacherIds,
          title: 'Class announcement',
          message: `Announcement: "${announcement.title}".`,
          category: 'ANNOUNCEMENT',
          dedupeKey: `announcement.published:${announcement.id}`,
          entityType: 'Announcement',
          entityId: announcement.id,
          actionPath: '/teacher/announcements',
        })
      );
    }

    return Promise.all(tasks);
  });
}

async function notifyTeacherAccountCreated(teacher) {
  if (!teacher?.id) return null;
  return safeEmit('teacher.created', async () => {
    const adminIds = await notificationService.listActiveAdminIds();
    return notificationService.createForRecipients({
      recipientType: 'ADMIN',
      recipientIds: adminIds,
      title: 'New teacher account',
      message: 'A new teacher account was created.',
      category: 'ADMINISTRATION',
      dedupeKey: `teacher.created:${teacher.id}`,
      entityType: 'Teacher',
      entityId: teacher.id,
      actionPath: '/admin/teachers',
    });
  });
}

async function notifyStudentAccountCreated(student) {
  if (!student?.id) return null;
  return safeEmit('student.created', async () => {
    const adminIds = await notificationService.listActiveAdminIds();
    return notificationService.createForRecipients({
      recipientType: 'ADMIN',
      recipientIds: adminIds,
      title: 'New student account',
      message: 'A new student account was created.',
      category: 'ADMINISTRATION',
      dedupeKey: `student.created:${student.id}`,
      entityType: 'Student',
      entityId: student.id,
      actionPath: '/admin/students',
    });
  });
}

async function notifyAccountStatusChanged({ type, id, isActive }) {
  if (!id || !type) return null;
  return safeEmit('account.status', async () => {
    // Bypass active-account filter so deactivation notices still reach the recipient.
    const { prisma } = require('../../config/database');
    const scope = notificationService.recipientScopeKey(type, id);
    const fields =
      type === 'TEACHER'
        ? { recipientType: 'TEACHER', teacherId: id, adminId: null, studentId: null }
        : { recipientType: 'STUDENT', studentId: id, adminId: null, teacherId: null };
    try {
      await prisma.notification.create({
        data: {
          ...fields,
          recipientScopeKey: scope,
          title: 'Account status updated',
          message: isActive ? 'Your account has been activated.' : 'Your account has been deactivated.',
          category: 'ADMINISTRATION',
          dedupeKey: `account.status:${type}:${id}:${isActive ? 'on' : 'off'}`,
          entityType: type === 'TEACHER' ? 'Teacher' : 'Student',
          entityId: String(id),
          actionPath: type === 'TEACHER' ? '/teacher/profile' : '/student/profile',
        },
      });
      return { created: 1 };
    } catch (error) {
      if (error?.code === 'P2002') return { created: 0 };
      throw error;
    }
  });
}

async function notifyDirectMessageReceived({ message, recipientType, recipientId }) {
  if (!message?.id || !recipientType || !recipientId) return null;
  const actionPath =
    recipientType === 'ADMIN'
      ? `/admin/messages/${message.conversationId}`
      : recipientType === 'TEACHER'
        ? `/teacher/messages/${message.conversationId}`
        : `/student/messages/${message.conversationId}`;

  return safeEmit('messaging.message', async () =>
    notificationService.createForRecipients({
      recipientType,
      recipientIds: [recipientId],
      title: 'New message',
      message: 'You received a new direct message.',
      category: 'MESSAGING',
      dedupeKey: `messaging.message:${message.id}`,
      entityType: 'Message',
      entityId: message.id,
      actionPath,
    })
  );
}

module.exports = {
  notifyAssignmentPublished,
  notifyAssignmentSubmitted,
  notifyAssignmentGraded,
  notifyAttendanceRecorded,
  notifyExamResultsSubmitted,
  notifyExamResultsPublished,
  notifyTimetablePublished,
  notifyTimetableChanged,
  notifyTimetableEntryCancelled,
  notifyLearningMaterialPublished,
  notifyAnnouncementPublished,
  notifyTeacherAccountCreated,
  notifyStudentAccountCreated,
  notifyAccountStatusChanged,
  notifyDirectMessageReceived,
};
