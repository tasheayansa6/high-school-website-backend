import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { useStudentAuth } from '@/hooks/useStudentAuth';

/** Keeps authenticated students off the login page. */
export function StudentGuestOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useStudentAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const redirectTo =
    typeof from === 'string' && from.startsWith('/student/') && from !== STUDENT_ROUTES.login
      ? from
      : STUDENT_ROUTES.dashboard;

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
