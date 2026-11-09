import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/60 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="font-display text-headline-sm text-primary">{title}</p>
      {description ? (
        <div className="mx-auto mt-2 max-w-lg text-body-md text-on-surface-variant">{description}</div>
      ) : null}
    </div>
  );
}
