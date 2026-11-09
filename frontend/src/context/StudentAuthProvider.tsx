import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import type { LogoutResult } from '@/context/auth-context';
import {
  StudentAuthContext,
  type StudentAuthContextValue,
  type StudentAuthStatus,
} from '@/context/student-auth-context';
import { toApiClientError } from '@/services/api/apiError';
import { queryKeys } from '@/services/api/queryKeys';
import { onStudentUnauthorized } from '@/services/api/studentAuthEvents';
import {
  clearStudentAccessToken,
  getStudentAccessToken,
  setStudentAccessToken,
} from '@/services/api/studentAuthToken';
import { fetchStudentMe, loginStudent, logoutStudent } from '@/services/student/studentAuthService';
import type { StudentLoginCredentials, StudentUser } from '@/types/student.types';

interface StudentAuthProviderProps {
  children: ReactNode;
}

export function StudentAuthProvider({ children }: StudentAuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StudentAuthStatus>('bootstrapping');
  const [student, setStudent] = useState<StudentUser | null>(null);

  // Only student-scoped caches are dropped so the admin session is never disturbed.
  const clearStudentCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.student.all });
  }, [queryClient]);

  const clearSession = useCallback(() => {
    clearStudentAccessToken();
    setStudent(null);
    setStatus('unauthenticated');
    clearStudentCache();
  }, [clearStudentCache]);

  const refreshProfile = useCallback(async () => {
    if (!getStudentAccessToken()) {
      clearSession();
      return null;
    }

    try {
      const response = await fetchStudentMe();
      setStudent(response.data.student);
      setStatus('authenticated');
      return response.data.student;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getStudentAccessToken()) {
        if (!cancelled) {
          setStatus('unauthenticated');
          setStudent(null);
        }
        return;
      }

      try {
        const response = await fetchStudentMe();
        if (!cancelled) {
          setStudent(response.data.student);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          clearStudentAccessToken();
          setStudent(null);
          setStatus('unauthenticated');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onStudentUnauthorized(() => {
      setStudent(null);
      setStatus('unauthenticated');
      clearStudentCache();
    });
  }, [clearStudentCache]);

  const login = useCallback(async (credentials: StudentLoginCredentials) => {
    const response = await loginStudent(credentials);
    setStudentAccessToken(response.data.accessToken);
    setStudent(response.data.student);
    setStatus('authenticated');
    return response.data.student;
  }, []);

  const logout = useCallback(async (): Promise<LogoutResult> => {
    if (!getStudentAccessToken()) {
      clearSession();
      return { serverInvalidated: false, message: 'Already signed out on this device.' };
    }

    try {
      const response = await logoutStudent();
      clearSession();
      return { serverInvalidated: true, message: response.message };
    } catch (error) {
      const apiError = toApiClientError(error);
      clearSession();
      if (apiError.isUnauthorized) {
        return {
          serverInvalidated: true,
          message: 'Session was already invalid. Local sign-out completed.',
        };
      }
      return {
        serverInvalidated: false,
        message:
          'Signed out locally, but the server could not confirm token invalidation. Please try again if this session remains active elsewhere.',
      };
    }
  }, [clearSession]);

  const value = useMemo<StudentAuthContextValue>(
    () => ({
      status,
      student,
      isAuthenticated: status === 'authenticated' && student !== null,
      isBootstrapping: status === 'bootstrapping',
      login,
      logout,
      refreshProfile,
    }),
    [status, student, login, logout, refreshProfile],
  );

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}
