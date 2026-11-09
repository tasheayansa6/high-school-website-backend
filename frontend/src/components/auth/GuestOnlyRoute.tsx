import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { useAuth } from '@/hooks/useAuth';

/** Keeps authenticated admins off the login page. */
export function GuestOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    typeof (location.state as { from?: string }).from === 'string'
      ? (location.state as { from: string }).from
      : ADMIN_ROUTES.dashboard;

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
