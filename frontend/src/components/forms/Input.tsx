import type { InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export function Input({ className, hasError = false, id, ...rest }: InputProps) {
  return (
    <input
      id={id}
      className={cn(
        'min-h-control-h w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3 font-sans text-body-md text-on-surface',
        'transition-colors duration-150',
        'placeholder:text-on-surface-variant/70',
        'focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/40',
        hasError && 'border-error ring-1 ring-error',
        className,
      )}
      {...rest}
    />
  );
}
