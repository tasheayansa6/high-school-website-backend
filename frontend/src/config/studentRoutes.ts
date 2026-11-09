export const STUDENT_ROUTES = {
  login: '/student/login',
  dashboard: '/student/dashboard',
  classes: '/student/classes',
  subjects: '/student/subjects',
  attendance: '/student/attendance',
  assignments: '/student/assignments',
  results: '/student/results',
  gradebook: '/student/gradebook',
  fees: '/student/fees',
  announcements: '/student/announcements',
  timetable: '/student/timetable',
  learningMaterials: '/student/learning-materials',
  notifications: '/student/notifications',
  messages: '/student/messages',
  profile: '/student/profile',
} as const;

export interface StudentNavItem {
  label: string;
  path: string;
  icon: string;
  group?: string;
}

/**
 * Minimized student sidebar — own enrollment only.
 * Notifications live in the header; subjects remain reachable from classes.
 */
export const STUDENT_NAV: readonly StudentNavItem[] = [
  { label: 'Dashboard', path: STUDENT_ROUTES.dashboard, icon: 'dashboard' },
  { label: 'My Classes', path: STUDENT_ROUTES.classes, icon: 'meeting_room', group: 'Learning' },
  { label: 'Assignments', path: STUDENT_ROUTES.assignments, icon: 'assignment', group: 'Learning' },
  { label: 'My Grades', path: STUDENT_ROUTES.gradebook, icon: 'grid_view', group: 'Learning' },
  {
    label: 'Materials',
    path: STUDENT_ROUTES.learningMaterials,
    icon: 'folder_open',
    group: 'Learning',
  },
  { label: 'Timetable', path: STUDENT_ROUTES.timetable, icon: 'calendar_month', group: 'School' },
  { label: 'Attendance', path: STUDENT_ROUTES.attendance, icon: 'fact_check', group: 'School' },
  { label: 'Fees', path: STUDENT_ROUTES.fees, icon: 'payments', group: 'School' },
  {
    label: 'Announcements',
    path: STUDENT_ROUTES.announcements,
    icon: 'campaign',
    group: 'School',
  },
  { label: 'Messages', path: STUDENT_ROUTES.messages, icon: 'chat', group: 'Account' },
  { label: 'My Profile', path: STUDENT_ROUTES.profile, icon: 'badge', group: 'Account' },
];
