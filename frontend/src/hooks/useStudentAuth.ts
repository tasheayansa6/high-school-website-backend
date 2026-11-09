import { useContext } from 'react';

import { StudentAuthContext } from '@/context/student-auth-context';

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
}
