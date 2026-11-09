export const TEACHER_ROUTES = {
  login: '/teacher/login',
  dashboard: '/teacher/dashboard',
  classes: '/teacher/classes',
  classDetail: (id: number | string) => `/teacher/classes/${id}`,
  subjects: '/teacher/subjects',
  students: '/teacher/students',
  attendance: '/teacher/attendance',
  assignments: '/teacher/assignments',
  results: '/teacher/results',
  gradebook: '/teacher/gradebook',
  announcements: '/teacher/announcements',
  timetable: '/teacher/timetable',
  learningMaterials: '/teacher/learning-materials',
  notifications: '/teacher/notifications',
  messages: '/teacher/messages',
  profile: '/teacher/profile',
} as const;

export interface TeacherNavItem {
  label: string;
  path: string;
  icon: string;
  group?: string;
}

/**
 * Minimized teacher sidebar — teach assigned classes only.
 * Subjects/students remain reachable from My Classes; notifications live in the header.
 */
export const TEACHER_NAV: readonly TeacherNavItem[] = [
  { label: 'Dashboard', path: TEACHER_ROUTES.dashboard, icon: 'dashboard' },
  { label: 'My Classes', path: TEACHER_ROUTES.classes, icon: 'meeting_room', group: 'Teaching' },
  { label: 'Attendance', path: TEACHER_ROUTES.attendance, icon: 'fact_check', group: 'Teaching' },
  { label: 'Assignments', path: TEACHER_ROUTES.assignments, icon: 'assignment', group: 'Teaching' },
  { label: 'Gradebook', path: TEACHER_ROUTES.gradebook, icon: 'grid_view', group: 'Teaching' },
  { label: 'Timetable', path: TEACHER_ROUTES.timetable, icon: 'calendar_month', group: 'Resources' },
  {
    label: 'Materials',
    path: TEACHER_ROUTES.learningMaterials,
    icon: 'folder_open',
    group: 'Resources',
  },
  {
    label: 'Announcements',
    path: TEACHER_ROUTES.announcements,
    icon: 'campaign',
    group: 'Resources',
  },
  { label: 'Messages', path: TEACHER_ROUTES.messages, icon: 'chat', group: 'Account' },
  { label: 'My Profile', path: TEACHER_ROUTES.profile, icon: 'badge', group: 'Account' },
];
