/**
 * Mirrors backend `src/config/roles.js`.
 * Frontend checks are UX only — the API enforces every permission.
 */

export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super-admin',
  CONTENT_EDITOR: 'content-editor',
  COMMUNICATION_MANAGER: 'communication-manager',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const PERMISSIONS = {
  ALL: '*',
  PAGES_MANAGE: 'pages:manage',
  PAGES_RESTORE: 'pages:restore',
  BLOG_MANAGE: 'blog:manage',
  BLOG_RESTORE: 'blog:restore',
  EVENTS_MANAGE: 'events:manage',
  EVENTS_RESTORE: 'events:restore',
  MEDIA_MANAGE: 'media:manage',
  MEDIA_RESTORE: 'media:restore',
  CONTACT_MANAGE: 'contact:manage',
  CONTACT_RESTORE: 'contact:restore',
  NEWSLETTER_MANAGE: 'newsletter:manage',
  NEWSLETTER_RESTORE: 'newsletter:restore',
  ADMISSIONS_MANAGE: 'admissions:manage',
  ADMISSIONS_RESTORE: 'admissions:restore',
  SETTINGS_MANAGE: 'settings:manage',
  ADMINS_MANAGE: 'admins:manage',
  DASHBOARD_READ: 'dashboard:read',
  // School Management System — Super Admin (*) covers these.
  TEACHERS_MANAGE: 'teachers:manage',
  TEACHERS_RESTORE: 'teachers:restore',
  STUDENTS_MANAGE: 'students:manage',
  STUDENTS_RESTORE: 'students:restore',
  ACADEMIC_MANAGE: 'academic:manage',
  ENROLLMENTS_MANAGE: 'enrollments:manage',
  ATTENDANCE_MANAGE: 'attendance:manage',
  ASSIGNMENTS_MANAGE: 'assignments:manage',
  EXAMS_MANAGE: 'exams:manage',
  RESULTS_MANAGE: 'results:manage',
  GRADEBOOK_MANAGE: 'gradebook:manage',
  FEES_MANAGE: 'fees:manage',
  ANNOUNCEMENTS_MANAGE: 'announcements:manage',
  TIMETABLES_MANAGE: 'timetables:manage',
  LEARNING_MATERIALS_MANAGE: 'learning_materials:manage',
  REPORTS_READ: 'reports:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleSlug, readonly Permission[]> = {
  [ROLE_SLUGS.SUPER_ADMIN]: [PERMISSIONS.ALL],
  [ROLE_SLUGS.CONTENT_EDITOR]: [
    PERMISSIONS.PAGES_MANAGE,
    PERMISSIONS.BLOG_MANAGE,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.DASHBOARD_READ,
  ],
  [ROLE_SLUGS.COMMUNICATION_MANAGER]: [
    PERMISSIONS.CONTACT_MANAGE,
    PERMISSIONS.NEWSLETTER_MANAGE,
    PERMISSIONS.ADMISSIONS_MANAGE,
    PERMISSIONS.DASHBOARD_READ,
  ],
};

export function hasPermission(
  permissions: readonly string[] | undefined,
  required: string,
): boolean {
  if (!permissions?.length) {
    return false;
  }
  if (permissions.includes(PERMISSIONS.ALL)) {
    return true;
  }
  return permissions.includes(required);
}

export function hasAllPermissions(
  permissions: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) {
    return true;
  }
  return required.every((permission) => hasPermission(permissions, permission));
}

export function hasAnyPermission(
  permissions: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) {
    return true;
  }
  return required.some((permission) => hasPermission(permissions, permission));
}
