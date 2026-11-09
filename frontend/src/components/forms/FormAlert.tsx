import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface FormAlertProps {
  tone: 'success' | 'error' | 'info';
  children: ReactNode;
  className?: string;
}

export function FormAlert({ tone, children, className }: FormAlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'border p-4 text-body-sm',
        tone === 'success' && 'border-success/30 bg-success-container text-success',
        tone === 'error' && 'border-error/30 bg-error-container text-error',
        tone === 'info' &&
          'border-outline-variant/40 bg-surface-container-low text-on-surface-variant',
        className,
      )}
    >
      {children}
    </div>
  );
}
