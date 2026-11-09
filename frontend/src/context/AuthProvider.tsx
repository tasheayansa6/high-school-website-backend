import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type LogoutResult,
} from '@/context/auth-context';
import { toApiClientError } from '@/services/api/apiError';
import { onAuthUnauthorized } from '@/services/api/authEvents';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/api/authToken';
import { fetchAdminProfile, loginAdmin, logoutAdmin } from '@/services/auth/authService';
import type { AdminUser, LoginCredentials } from '@/services/auth/authTypes';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const clearSession = useCallback(() => {
    clearAccessToken();
    setAdmin(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      clearSession();
      return null;
    }

    try {
      const response = await fetchAdminProfile();
      setAdmin(response.data.admin);
      setStatus('authenticated');
      return response.data.admin;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setStatus('unauthenticated');
          setAdmin(null);
        }
        return;
      }

      try {
        const response = await fetchAdminProfile();
        if (!cancelled) {
          setAdmin(response.data.admin);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          clearAccessToken();
          setAdmin(null);
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
    return onAuthUnauthorized(() => {
      setAdmin(null);
      setStatus('unauthenticated');
      queryClient.clear();
    });
  }, [queryClient]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await loginAdmin(credentials);
    setAccessToken(response.data.accessToken);
    setAdmin(response.data.admin);
    setStatus('authenticated');
    return response.data.admin;
  }, []);

  const logout = useCallback(async (): Promise<LogoutResult> => {
    const hadToken = Boolean(getAccessToken());

    if (!hadToken) {
      clearSession();
      return {
        serverInvalidated: false,
        message: 'Already signed out on this device.',
      };
    }

    try {
      const response = await logoutAdmin();
      clearSession();
      return {
        serverInvalidated: true,
        message: response.message,
      };
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

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      admin,
      isAuthenticated: status === 'authenticated' && admin !== null,
      isBootstrapping: status === 'bootstrapping',
      login,
      logout,
      refreshProfile,
    }),
    [status, admin, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
