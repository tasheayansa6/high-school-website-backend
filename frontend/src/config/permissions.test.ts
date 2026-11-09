import { describe, expect, it } from 'vitest';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_SLUGS,
} from '@/config/permissions';

describe('permissions helpers', () => {
  it('grants all permissions to super-admin wildcard', () => {
    const permissions = ROLE_PERMISSIONS[ROLE_SLUGS.SUPER_ADMIN];
    expect(hasPermission(permissions, PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
    expect(
      hasAllPermissions(permissions, [PERMISSIONS.BLOG_MANAGE, PERMISSIONS.SETTINGS_MANAGE]),
    ).toBe(true);
  });

  it('limits content-editor permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLE_SLUGS.CONTENT_EDITOR];
    expect(hasPermission(permissions, PERMISSIONS.PAGES_MANAGE)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
    expect(
      hasAnyPermission(permissions, [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.BLOG_MANAGE]),
    ).toBe(true);
  });

  it('limits communication-manager permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLE_SLUGS.COMMUNICATION_MANAGER];
    expect(hasPermission(permissions, PERMISSIONS.CONTACT_MANAGE)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.PAGES_MANAGE)).toBe(false);
    expect(hasPermission(permissions, PERMISSIONS.DASHBOARD_READ)).toBe(true);
  });
});
