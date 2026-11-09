import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';

/** Requires an authenticated teacher session verified via backend `/teacher/auth/me`. */
export function TeacherProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useTeacherAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Verifying teacher session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={TEACHER_ROUTES.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
