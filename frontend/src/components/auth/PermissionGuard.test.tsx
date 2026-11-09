import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';

const useAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuth(),
}));

function wrap() {
  return render(
    <MemoryRouter initialEntries={['/admin/settings']}>
      <Routes>
        <Route
          path="/admin/settings"
          element={<PermissionGuard permissions={[PERMISSIONS.SETTINGS_MANAGE]} />}
        >
          <Route index element={<div>Settings allowed</div>} />
        </Route>
        <Route path="/admin/forbidden" element={<div>Forbidden page</div>} />
        <Route path="/admin/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PermissionGuard', () => {
  it('allows access when permission is present', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      admin: { permissions: [PERMISSIONS.SETTINGS_MANAGE] },
    });
    wrap();
    expect(screen.getByText('Settings allowed')).toBeInTheDocument();
  });

  it('redirects to forbidden when permission is missing', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      admin: { permissions: [PERMISSIONS.BLOG_MANAGE] },
    });
    wrap();
    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
  });

  it('allows wildcard super-admin permission', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      admin: { permissions: [PERMISSIONS.ALL] },
    });
    wrap();
    expect(screen.getByText('Settings allowed')).toBeInTheDocument();
  });
});
