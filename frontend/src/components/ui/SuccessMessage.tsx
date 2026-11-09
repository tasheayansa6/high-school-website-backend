import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface SuccessMessageProps {
  children: ReactNode;
  className?: string;
}

export function SuccessMessage({ children, className }: SuccessMessageProps) {
  return (
    <div
      role="status"
      className={cn(
        'border border-success/30 bg-success-container p-4 text-body-md text-success',
        className,
      )}
    >
      {children}
    </div>
  );
}
