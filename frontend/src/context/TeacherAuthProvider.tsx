import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import type { LogoutResult } from '@/context/auth-context';
import {
  TeacherAuthContext,
  type TeacherAuthContextValue,
  type TeacherAuthStatus,
} from '@/context/teacher-auth-context';
import { toApiClientError } from '@/services/api/apiError';
import { queryKeys } from '@/services/api/queryKeys';
import { onTeacherUnauthorized } from '@/services/api/teacherAuthEvents';
import {
  clearTeacherAccessToken,
  getTeacherAccessToken,
  setTeacherAccessToken,
} from '@/services/api/teacherAuthToken';
import { fetchTeacherMe, loginTeacher, logoutTeacher } from '@/services/teacher/teacherAuthService';
import type { TeacherLoginCredentials, TeacherUser } from '@/types/teacher.types';

interface TeacherAuthProviderProps {
  children: ReactNode;
}

export function TeacherAuthProvider({ children }: TeacherAuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TeacherAuthStatus>('bootstrapping');
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);

  // Only teacher-scoped caches are dropped so the admin session is never disturbed.
  const clearTeacherCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.teacher.all });
  }, [queryClient]);

  const clearSession = useCallback(() => {
    clearTeacherAccessToken();
    setTeacher(null);
    setStatus('unauthenticated');
    clearTeacherCache();
  }, [clearTeacherCache]);

  const refreshProfile = useCallback(async () => {
    if (!getTeacherAccessToken()) {
      clearSession();
      return null;
    }

    try {
      const response = await fetchTeacherMe();
      setTeacher(response.data.teacher);
      setStatus('authenticated');
      return response.data.teacher;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getTeacherAccessToken()) {
        if (!cancelled) {
          setStatus('unauthenticated');
          setTeacher(null);
        }
        return;
      }

      try {
        const response = await fetchTeacherMe();
        if (!cancelled) {
          setTeacher(response.data.teacher);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          clearTeacherAccessToken();
          setTeacher(null);
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
    return onTeacherUnauthorized(() => {
      setTeacher(null);
      setStatus('unauthenticated');
      clearTeacherCache();
    });
  }, [clearTeacherCache]);

  const login = useCallback(async (credentials: TeacherLoginCredentials) => {
    const response = await loginTeacher(credentials);
    setTeacherAccessToken(response.data.accessToken);
    setTeacher(response.data.teacher);
    setStatus('authenticated');
    return response.data.teacher;
  }, []);

  const logout = useCallback(async (): Promise<LogoutResult> => {
    if (!getTeacherAccessToken()) {
      clearSession();
      return { serverInvalidated: false, message: 'Already signed out on this device.' };
    }

    try {
      const response = await logoutTeacher();
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

  const value = useMemo<TeacherAuthContextValue>(
    () => ({
      status,
      teacher,
      isAuthenticated: status === 'authenticated' && teacher !== null,
      isBootstrapping: status === 'bootstrapping',
      login,
      logout,
      refreshProfile,
    }),
    [status, teacher, login, logout, refreshProfile],
  );

  return <TeacherAuthContext.Provider value={value}>{children}</TeacherAuthContext.Provider>;
}
