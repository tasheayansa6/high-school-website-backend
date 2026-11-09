import { useContext } from 'react';

import { TeacherAuthContext } from '@/context/teacher-auth-context';

export function useTeacherAuth() {
  const context = useContext(TeacherAuthContext);
  if (!context) {
    throw new Error('useTeacherAuth must be used within TeacherAuthProvider');
  }
  return context;
}
