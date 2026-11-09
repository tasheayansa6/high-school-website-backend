import { createContext } from 'react';

import type { AdminUser, LoginCredentials } from '@/services/auth/authTypes';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export interface LogoutResult {
  serverInvalidated: boolean;
  message: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<AdminUser>;
  logout: () => Promise<LogoutResult>;
  refreshProfile: () => Promise<AdminUser | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
