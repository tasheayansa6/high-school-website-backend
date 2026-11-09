import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';

/** Keeps authenticated teachers off the login page. */
export function TeacherGuestOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useTeacherAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const redirectTo =
    typeof from === 'string' && from.startsWith('/teacher/') && from !== TEACHER_ROUTES.login
      ? from
      : TEACHER_ROUTES.dashboard;

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
