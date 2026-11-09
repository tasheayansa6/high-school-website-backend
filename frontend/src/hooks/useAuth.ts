import { useContext } from 'react';

import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/config/permissions';
import { AuthContext } from '@/context/auth-context';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function usePermission(permission: string): boolean {
  const { admin } = useAuth();
  return hasPermission(admin?.permissions, permission);
}

export function usePermissions(required: readonly string[], mode: 'all' | 'any' = 'all'): boolean {
  const { admin } = useAuth();
  return mode === 'any'
    ? hasAnyPermission(admin?.permissions, required)
    : hasAllPermissions(admin?.permissions, required);
}
