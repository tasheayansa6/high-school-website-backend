import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

export function Select({ className, hasError = false, id, children, ...rest }: SelectProps) {
  return (
    <select
      id={id}
      className={cn(
        'min-h-control-h w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3 font-sans text-body-md text-on-surface',
        'transition-colors duration-150',
        'focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
        hasError && 'border-error ring-1 ring-error',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
