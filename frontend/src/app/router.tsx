import { lazy, type ReactNode, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { GuestOnlyRoute } from '@/components/auth/GuestOnlyRoute';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StudentGuestOnlyRoute } from '@/components/auth/StudentGuestOnlyRoute';
import { StudentProtectedRoute } from '@/components/auth/StudentProtectedRoute';
import { TeacherGuestOnlyRoute } from '@/components/auth/TeacherGuestOnlyRoute';
import { TeacherProtectedRoute } from '@/components/auth/TeacherProtectedRoute';
import { RouteLoadingFallback } from '@/components/common/RouteLoadingFallback';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { PERMISSIONS } from '@/config/permissions';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';

const HomePage = lazy(() => import('@/pages/Home/HomePage'));
const AboutPage = lazy(() => import('@/pages/About/AboutPage'));
const AcademicsPage = lazy(() => import('@/pages/Academics/AcademicsPage'));
const BlogsPage = lazy(() => import('@/pages/Blogs/BlogsPage'));
const BlogDetailPage = lazy(() => import('@/pages/Blogs/BlogDetailPage'));
const EventsPage = lazy(() => import('@/pages/Events/EventsPage'));
const EventDetailPage = lazy(() => import('@/pages/Events/EventDetailPage'));
const CmsPage = lazy(() => import('@/pages/Content/CmsPage'));
const ContactPage = lazy(() => import('@/pages/Contact/ContactPage'));
const RegisterPage = lazy(() => import('@/pages/Register/RegisterPage'));
const NewsletterConfirmPage = lazy(
  () => import('@/pages/Newsletter/NewsletterConfirmPage'),
);
const NewsletterUnsubscribePage = lazy(
  () => import('@/pages/Newsletter/NewsletterUnsubscribePage'),
);
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));

function LegacyBlogToNewsRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/news/${slug}` : '/news'} replace />;
}

const SignInIdentifyPage = lazy(() => import('@/pages/SignIn/SignInIdentifyPage'));
const AdminLoginPage = lazy(() => import('@/pages/Admin/Login/AdminLoginPage'));
const TeacherLoginPage = lazy(() => import('@/pages/Teacher/Login/TeacherLoginPage'));
const TeacherDashboardPage = lazy(() => import('@/pages/Teacher/Dashboard/TeacherDashboardPage'));
const TeacherClassesPage = lazy(() => import('@/pages/Teacher/Classes/TeacherClassesPage'));
const TeacherClassDetailPage = lazy(() => import('@/pages/Teacher/Classes/TeacherClassDetailPage'));
const TeacherSubjectsPage = lazy(() => import('@/pages/Teacher/Subjects/TeacherSubjectsPage'));
const TeacherStudentsPage = lazy(() => import('@/pages/Teacher/Students/TeacherStudentsPage'));
const TeacherProfilePage = lazy(() => import('@/pages/Teacher/Profile/TeacherProfilePage'));
const StudentLoginPage = lazy(() => import('@/pages/Student/Login/StudentLoginPage'));
const StudentDashboardPage = lazy(() => import('@/pages/Student/Dashboard/StudentDashboardPage'));
const StudentClassesPage = lazy(() => import('@/pages/Student/Classes/StudentClassesPage'));
const StudentSubjectsPage = lazy(() => import('@/pages/Student/Subjects/StudentSubjectsPage'));
const StudentProfilePage = lazy(() => import('@/pages/Student/Profile/StudentProfilePage'));
const AdminDashboardPage = lazy(() => import('@/pages/Admin/Dashboard/AdminDashboardPage'));
const AdminForbiddenPage = lazy(() => import('@/pages/Admin/Forbidden/AdminForbiddenPage'));
const AdminPagesPage = lazy(() => import('@/pages/Admin/Pages/AdminPagesPage'));
const AdminPageEditorPage = lazy(() => import('@/pages/Admin/Pages/AdminPageEditorPage'));
const AdminBlogsPage = lazy(() => import('@/pages/Admin/Blogs/AdminBlogsPage'));
const AdminBlogEditorPage = lazy(() => import('@/pages/Admin/Blogs/AdminBlogEditorPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/Admin/Categories/AdminCategoriesPage'));
const AdminEventsPage = lazy(() => import('@/pages/Admin/Events/AdminEventsPage'));
const AdminEventEditorPage = lazy(() => import('@/pages/Admin/Events/AdminEventEditorPage'));
const AdminMediaPage = lazy(() => import('@/pages/Admin/Media/AdminMediaPage'));
const AdminInquiriesPage = lazy(() => import('@/pages/Admin/Inquiries/AdminInquiriesPage'));
const AdminContactPage = lazy(() => import('@/pages/Admin/Contact/AdminContactPage'));
const AdminNewsletterPage = lazy(() => import('@/pages/Admin/Newsletter/AdminNewsletterPage'));
const AdminSettingsPage = lazy(() => import('@/pages/Admin/Settings/AdminSettingsPage'));
const AdminTeachersPage = lazy(() => import('@/pages/Admin/Teachers/AdminTeachersPage'));
const AdminTeacherEditorPage = lazy(() => import('@/pages/Admin/Teachers/AdminTeacherEditorPage'));
const AdminStudentsPage = lazy(() => import('@/pages/Admin/Students/AdminStudentsPage'));
const AdminStudentEditorPage = lazy(() => import('@/pages/Admin/Students/AdminStudentEditorPage'));
const AdminAcademicYearsPage = lazy(
  () => import('@/pages/Admin/AcademicYears/AdminAcademicYearsPage'),
);
const AdminGradeLevelsPage = lazy(() => import('@/pages/Admin/GradeLevels/AdminGradeLevelsPage'));
const AdminSectionsPage = lazy(() => import('@/pages/Admin/Sections/AdminSectionsPage'));
const AdminSubjectsPage = lazy(() => import('@/pages/Admin/Subjects/AdminSubjectsPage'));
const AdminClassOfferingsPage = lazy(() => import('@/pages/Admin/Classes/AdminClassOfferingsPage'));
const AdminTeachingAssignmentsPage = lazy(
  () => import('@/pages/Admin/TeachingAssignments/AdminTeachingAssignmentsPage'),
);
const AdminEnrollmentsPage = lazy(() => import('@/pages/Admin/Enrollments/AdminEnrollmentsPage'));

const AdminAttendancePage = lazy(() => import('@/pages/Admin/Attendance/AdminAttendancePage'));
const AdminAssignmentsPage = lazy(() => import('@/pages/Admin/Assignments/AdminAssignmentsPage'));
const AdminExaminationsPage = lazy(
  () => import('@/pages/Admin/Examinations/AdminExaminationsPage'),
);
const AdminFeesPage = lazy(() => import('@/pages/Admin/Fees/AdminFeesPage'));
const AdminAnnouncementsPage = lazy(
  () => import('@/pages/Admin/Announcements/AdminAnnouncementsPage'),
);
const AdminTimetablesPage = lazy(() => import('@/pages/Admin/Timetables/AdminTimetablesPage'));
const AdminLearningMaterialsPage = lazy(
  () => import('@/pages/Admin/LearningMaterials/AdminLearningMaterialsPage'),
);
const AdminGradebookPage = lazy(() => import('@/pages/Admin/Gradebook/AdminGradebookPage'));
const AdminReportsPage = lazy(() => import('@/pages/Admin/Reports/AdminReportsPage'));
const AdminNotificationsPage = lazy(
  () => import('@/pages/Admin/Notifications/AdminNotificationsPage'),
);
const AdminMessagesPage = lazy(() => import('@/pages/Admin/Messages/AdminMessagesPage'));
const TeacherAttendancePage = lazy(
  () => import('@/pages/Teacher/Attendance/TeacherAttendancePage'),
);
const TeacherAssignmentsPage = lazy(
  () => import('@/pages/Teacher/Assignments/TeacherAssignmentsPage'),
);
const TeacherResultsPage = lazy(() => import('@/pages/Teacher/Results/TeacherResultsPage'));
const TeacherGradebookPage = lazy(() => import('@/pages/Teacher/Gradebook/TeacherGradebookPage'));
const TeacherAnnouncementsPage = lazy(
  () => import('@/pages/Teacher/Announcements/TeacherAnnouncementsPage'),
);
const TeacherTimetablePage = lazy(() => import('@/pages/Teacher/Timetable/TeacherTimetablePage'));
const TeacherLearningMaterialsPage = lazy(
  () => import('@/pages/Teacher/LearningMaterials/TeacherLearningMaterialsPage'),
);
const TeacherNotificationsPage = lazy(
  () => import('@/pages/Teacher/Notifications/TeacherNotificationsPage'),
);
const TeacherMessagesPage = lazy(() => import('@/pages/Teacher/Messages/TeacherMessagesPage'));
const StudentAttendancePage = lazy(
  () => import('@/pages/Student/Attendance/StudentAttendancePage'),
);
const StudentAssignmentsPage = lazy(
  () => import('@/pages/Student/Assignments/StudentAssignmentsPage'),
);
const StudentResultsPage = lazy(() => import('@/pages/Student/Results/StudentResultsPage'));
const StudentGradebookPage = lazy(() => import('@/pages/Student/Gradebook/StudentGradebookPage'));
const StudentFeesPage = lazy(() => import('@/pages/Student/Fees/StudentFeesPage'));
const StudentAnnouncementsPage = lazy(
  () => import('@/pages/Student/Announcements/StudentAnnouncementsPage'),
);
const StudentTimetablePage = lazy(() => import('@/pages/Student/Timetable/StudentTimetablePage'));
const StudentLearningMaterialsPage = lazy(
  () => import('@/pages/Student/LearningMaterials/StudentLearningMaterialsPage'),
);
const StudentNotificationsPage = lazy(
  () => import('@/pages/Student/Notifications/StudentNotificationsPage'),
);
const StudentMessagesPage = lazy(() => import('@/pages/Student/Messages/StudentMessagesPage'));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={withSuspense(<HomePage />)} />
        <Route path="about" element={withSuspense(<AboutPage />)} />
        <Route path="academics" element={withSuspense(<AcademicsPage />)} />
        <Route path="feature" element={<Navigate to="/academics" replace />} />
        <Route path="news" element={withSuspense(<BlogsPage />)} />
        <Route path="news/:slug" element={withSuspense(<BlogDetailPage />)} />
        <Route path="blogs" element={<Navigate to="/news" replace />} />
        <Route path="blogs/:slug" element={<LegacyBlogToNewsRedirect />} />
        <Route path="events" element={withSuspense(<EventsPage />)} />
        <Route path="events/:slug" element={withSuspense(<EventDetailPage />)} />
        <Route path="content/:slug" element={withSuspense(<CmsPage />)} />
        <Route path="contact" element={withSuspense(<ContactPage />)} />
        <Route path="pricing" element={<Navigate to="/events" replace />} />
        <Route path="request-demo" element={<Navigate to="/admission" replace />} />
        <Route path="admission" element={withSuspense(<RegisterPage />)} />
        <Route path="register" element={<Navigate to="/admission" replace />} />
        <Route
          path="newsletter/confirm"
          element={withSuspense(<NewsletterConfirmPage />)}
        />
        <Route
          path="newsletter/unsubscribe"
          element={withSuspense(<NewsletterUnsubscribePage />)}
        />
        <Route path="*" element={withSuspense(<NotFoundPage />)} />
      </Route>

      <Route path="/signin" element={withSuspense(<SignInIdentifyPage />)} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/admin/login" element={<GuestOnlyRoute />}>
        <Route index element={withSuspense(<AdminLoginPage />)} />
      </Route>
      <Route path="/teacher/login" element={<TeacherGuestOnlyRoute />}>
        <Route index element={withSuspense(<TeacherLoginPage />)} />
      </Route>
      <Route path="/student/login" element={<StudentGuestOnlyRoute />}>
        <Route index element={withSuspense(<StudentLoginPage />)} />
      </Route>

      <Route path="/teacher" element={<TeacherProtectedRoute />}>
        <Route element={<TeacherLayout />}>
          <Route index element={<Navigate to={TEACHER_ROUTES.dashboard} replace />} />
          <Route path="dashboard" element={withSuspense(<TeacherDashboardPage />)} />
          <Route path="classes" element={withSuspense(<TeacherClassesPage />)} />
          <Route path="classes/:id" element={withSuspense(<TeacherClassDetailPage />)} />
          <Route path="subjects" element={withSuspense(<TeacherSubjectsPage />)} />
          <Route path="students" element={withSuspense(<TeacherStudentsPage />)} />
          <Route path="attendance" element={withSuspense(<TeacherAttendancePage />)} />
          <Route path="assignments" element={withSuspense(<TeacherAssignmentsPage />)} />
          <Route path="results" element={withSuspense(<TeacherResultsPage />)} />
          <Route path="gradebook" element={withSuspense(<TeacherGradebookPage />)} />
          <Route path="announcements" element={withSuspense(<TeacherAnnouncementsPage />)} />
          <Route path="timetable" element={withSuspense(<TeacherTimetablePage />)} />
          <Route
            path="learning-materials"
            element={withSuspense(<TeacherLearningMaterialsPage />)}
          />
          <Route path="notifications" element={withSuspense(<TeacherNotificationsPage />)} />
          <Route path="messages" element={withSuspense(<TeacherMessagesPage />)} />
          <Route path="messages/:conversationId" element={withSuspense(<TeacherMessagesPage />)} />
          <Route path="profile" element={withSuspense(<TeacherProfilePage />)} />
          <Route path="*" element={withSuspense(<NotFoundPage />)} />
        </Route>
      </Route>

      <Route path="/student" element={<StudentProtectedRoute />}>
        <Route element={<StudentLayout />}>
          <Route index element={<Navigate to={STUDENT_ROUTES.dashboard} replace />} />
          <Route path="dashboard" element={withSuspense(<StudentDashboardPage />)} />
          <Route path="classes" element={withSuspense(<StudentClassesPage />)} />
          <Route path="subjects" element={withSuspense(<StudentSubjectsPage />)} />
          <Route path="timetable" element={withSuspense(<StudentTimetablePage />)} />
          <Route
            path="learning-materials"
            element={withSuspense(<StudentLearningMaterialsPage />)}
          />
          <Route path="attendance" element={withSuspense(<StudentAttendancePage />)} />
          <Route path="assignments" element={withSuspense(<StudentAssignmentsPage />)} />
          <Route path="results" element={withSuspense(<StudentResultsPage />)} />
          <Route path="gradebook" element={withSuspense(<StudentGradebookPage />)} />
          <Route path="fees" element={withSuspense(<StudentFeesPage />)} />
          <Route path="announcements" element={withSuspense(<StudentAnnouncementsPage />)} />
          <Route path="notifications" element={withSuspense(<StudentNotificationsPage />)} />
          <Route path="messages" element={withSuspense(<StudentMessagesPage />)} />
          <Route path="messages/:conversationId" element={withSuspense(<StudentMessagesPage />)} />
          <Route path="profile" element={withSuspense(<StudentProfilePage />)} />
          <Route path="*" element={withSuspense(<NotFoundPage />)} />
        </Route>
      </Route>

      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to={ADMIN_ROUTES.dashboard} replace />} />
          <Route element={<PermissionGuard permissions={[PERMISSIONS.DASHBOARD_READ]} />}>
            <Route path="dashboard" element={withSuspense(<AdminDashboardPage />)} />
          </Route>
          <Route path="forbidden" element={withSuspense(<AdminForbiddenPage />)} />
          <Route element={<PermissionGuard permissions={[PERMISSIONS.TEACHERS_MANAGE]} />}>
            <Route path="teachers" element={withSuspense(<AdminTeachersPage />)} />
            <Route path="teachers/new" element={withSuspense(<AdminTeacherEditorPage />)} />
            <Route path="teachers/:id" element={withSuspense(<AdminTeacherEditorPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.STUDENTS_MANAGE]} />}>
            <Route path="students" element={withSuspense(<AdminStudentsPage />)} />
            <Route path="students/new" element={withSuspense(<AdminStudentEditorPage />)} />
            <Route path="students/:id" element={withSuspense(<AdminStudentEditorPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ACADEMIC_MANAGE]} />}>
            <Route path="academic-years" element={withSuspense(<AdminAcademicYearsPage />)} />
            <Route path="grade-levels" element={withSuspense(<AdminGradeLevelsPage />)} />
            <Route path="sections" element={withSuspense(<AdminSectionsPage />)} />
            <Route path="subjects" element={withSuspense(<AdminSubjectsPage />)} />
            <Route path="classes" element={withSuspense(<AdminClassOfferingsPage />)} />
            <Route
              path="teaching-assignments"
              element={withSuspense(<AdminTeachingAssignmentsPage />)}
            />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ENROLLMENTS_MANAGE]} />}>
            <Route path="enrollments" element={withSuspense(<AdminEnrollmentsPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ATTENDANCE_MANAGE]} />}>
            <Route path="attendance" element={withSuspense(<AdminAttendancePage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ASSIGNMENTS_MANAGE]} />}>
            <Route path="assignments" element={withSuspense(<AdminAssignmentsPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.EXAMS_MANAGE]} />}>
            <Route path="examinations" element={withSuspense(<AdminExaminationsPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.GRADEBOOK_MANAGE]} />}>
            <Route path="gradebook" element={withSuspense(<AdminGradebookPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.FEES_MANAGE]} />}>
            <Route path="fees" element={withSuspense(<AdminFeesPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ANNOUNCEMENTS_MANAGE]} />}>
            <Route path="announcements" element={withSuspense(<AdminAnnouncementsPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.TIMETABLES_MANAGE]} />}>
            <Route path="timetables" element={withSuspense(<AdminTimetablesPage />)} />
          </Route>
          <Route
            element={<PermissionGuard permissions={[PERMISSIONS.LEARNING_MATERIALS_MANAGE]} />}
          >
            <Route
              path="learning-materials"
              element={withSuspense(<AdminLearningMaterialsPage />)}
            />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.REPORTS_READ]} />}>
            <Route path="reports" element={withSuspense(<AdminReportsPage />)} />
          </Route>
          <Route path="notifications" element={withSuspense(<AdminNotificationsPage />)} />
          <Route path="messages" element={withSuspense(<AdminMessagesPage />)} />
          <Route path="messages/:conversationId" element={withSuspense(<AdminMessagesPage />)} />
          <Route element={<PermissionGuard permissions={[PERMISSIONS.PAGES_MANAGE]} />}>
            <Route path="pages" element={withSuspense(<AdminPagesPage />)} />
            <Route path="pages/new" element={withSuspense(<AdminPageEditorPage />)} />
            <Route path="pages/:id" element={withSuspense(<AdminPageEditorPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.BLOG_MANAGE]} />}>
            <Route path="blogs" element={withSuspense(<AdminBlogsPage />)} />
            <Route path="blogs/new" element={withSuspense(<AdminBlogEditorPage />)} />
            <Route path="blogs/:id" element={withSuspense(<AdminBlogEditorPage />)} />
            <Route path="blog-categories" element={withSuspense(<AdminCategoriesPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.EVENTS_MANAGE]} />}>
            <Route path="events" element={withSuspense(<AdminEventsPage />)} />
            <Route path="events/new" element={withSuspense(<AdminEventEditorPage />)} />
            <Route path="events/:id" element={withSuspense(<AdminEventEditorPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.MEDIA_MANAGE]} />}>
            <Route path="media" element={withSuspense(<AdminMediaPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.ADMISSIONS_MANAGE]} />}>
            <Route path="inquiries" element={withSuspense(<AdminInquiriesPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.CONTACT_MANAGE]} />}>
            <Route path="contact" element={withSuspense(<AdminContactPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.NEWSLETTER_MANAGE]} />}>
            <Route path="newsletter" element={withSuspense(<AdminNewsletterPage />)} />
          </Route>
          <Route element={<PermissionGuard permissions={[PERMISSIONS.SETTINGS_MANAGE]} />}>
            <Route path="settings" element={withSuspense(<AdminSettingsPage />)} />
          </Route>
          <Route path="*" element={withSuspense(<NotFoundPage />)} />
        </Route>
      </Route>
    </Routes>
  );
}
