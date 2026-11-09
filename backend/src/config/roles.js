/**
 * Database-backed role slugs and centralized permission map.
 * Authorization middleware reads the admin's role from MySQL, then checks
 * permissions here. JWT payloads must not be trusted for authorization.
 */

const ROLE_SLUGS = Object.freeze({
  SUPER_ADMIN: 'super-admin',
  CONTENT_EDITOR: 'content-editor',
  COMMUNICATION_MANAGER: 'communication-manager',
});

const PERMISSIONS = Object.freeze({
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
  // School Management System (Phase 2) — Super Admin (*) covers these.
  TEACHERS_MANAGE: 'teachers:manage',
  TEACHERS_RESTORE: 'teachers:restore',
  STUDENTS_MANAGE: 'students:manage',
  STUDENTS_RESTORE: 'students:restore',
  ACADEMIC_MANAGE: 'academic:manage',
  ENROLLMENTS_MANAGE: 'enrollments:manage',
  // SMS operations modules
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
});

const ROLE_PERMISSIONS = Object.freeze({
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
});

const DEFAULT_ROLES = Object.freeze([
  {
    name: 'Super Admin',
    slug: ROLE_SLUGS.SUPER_ADMIN,
    description: 'Full website administration',
  },
  {
    name: 'Content Editor',
    slug: ROLE_SLUGS.CONTENT_EDITOR,
    description: 'Manage website pages, blog posts, events, and media',
  },
  {
    name: 'Communication Manager',
    slug: ROLE_SLUGS.COMMUNICATION_MANAGER,
    description: 'Manage contact messages, newsletter subscribers, and admissions inquiries',
  },
]);

function getPermissionsForRoleSlug(roleSlug) {
  return ROLE_PERMISSIONS[roleSlug] || [];
}

function roleHasPermission(roleSlug, permission) {
  const permissions = getPermissionsForRoleSlug(roleSlug);

  if (permissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  return permissions.includes(permission);
}

function roleHasAnyPermission(roleSlug, requiredPermissions = []) {
  if (!requiredPermissions.length) {
    return true;
  }

  return requiredPermissions.some((permission) =>
    roleHasPermission(roleSlug, permission)
  );
}

function roleHasAllPermissions(roleSlug, requiredPermissions = []) {
  if (!requiredPermissions.length) {
    return true;
  }

  return requiredPermissions.every((permission) =>
    roleHasPermission(roleSlug, permission)
  );
}

module.exports = {
  ROLE_SLUGS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  DEFAULT_ROLES,
  getPermissionsForRoleSlug,
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
};
