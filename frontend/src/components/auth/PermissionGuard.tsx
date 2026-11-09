import { Navigate, Outlet } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { hasAllPermissions, hasAnyPermission } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  permissions: readonly string[];
  mode?: 'all' | 'any';
}

/** UX-only permission gate. Backend still enforces every protected API. */
export function PermissionGuard({ permissions, mode = 'all' }: PermissionGuardProps) {
  const { admin, isBootstrapping, isAuthenticated } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingState message="Checking access…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ADMIN_ROUTES.login} replace />;
  }

  const allowed =
    mode === 'any'
      ? hasAnyPermission(admin?.permissions, permissions)
      : hasAllPermissions(admin?.permissions, permissions);

  if (!allowed) {
    return <Navigate to={ADMIN_ROUTES.forbidden} replace />;
  }

  return <Outlet />;
}
