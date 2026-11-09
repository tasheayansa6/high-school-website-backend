import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface FormFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  className?: string;
}

export function FormField({
  id,
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <label
        htmlFor={id}
        className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-on-surface-variant">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
