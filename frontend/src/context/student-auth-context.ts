import { createContext } from 'react';

import type { LogoutResult } from '@/context/auth-context';
import type { StudentLoginCredentials, StudentUser } from '@/types/student.types';

export type StudentAuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export interface StudentAuthContextValue {
  status: StudentAuthStatus;
  student: StudentUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: StudentLoginCredentials) => Promise<StudentUser>;
  logout: () => Promise<LogoutResult>;
  refreshProfile: () => Promise<StudentUser | null>;
}

export const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);
