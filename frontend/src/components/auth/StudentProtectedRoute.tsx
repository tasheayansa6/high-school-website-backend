import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/LoadingState';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { useStudentAuth } from '@/hooks/useStudentAuth';

/** Requires an authenticated student session verified via backend `/student/auth/me`. */
export function StudentProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useStudentAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState message="Verifying student session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={STUDENT_ROUTES.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
