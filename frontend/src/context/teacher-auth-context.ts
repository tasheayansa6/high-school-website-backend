import { createContext } from 'react';

import type { LogoutResult } from '@/context/auth-context';
import type { TeacherLoginCredentials, TeacherUser } from '@/types/teacher.types';

export type TeacherAuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export interface TeacherAuthContextValue {
  status: TeacherAuthStatus;
  teacher: TeacherUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: TeacherLoginCredentials) => Promise<TeacherUser>;
  logout: () => Promise<LogoutResult>;
  refreshProfile: () => Promise<TeacherUser | null>;
}

export const TeacherAuthContext = createContext<TeacherAuthContextValue | null>(null);
