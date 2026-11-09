import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

export function Textarea({ className, hasError = false, id, rows = 5, ...rest }: TextareaProps) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={cn(
        'min-h-28 w-full resize-y rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3 font-sans text-body-md text-on-surface',
        'transition-colors duration-150',
        'focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary',
        hasError && 'border-error ring-1 ring-error',
        className,
      )}
      {...rest}
    />
  );
}
