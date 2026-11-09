import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
  titleId?: string;
  invert?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  titleId,
  invert = false,
}: SectionHeadingProps) {
  return (
    <div className={cn('max-w-3xl', className)}>
      {eyebrow ? (
        <span
          className={cn(
            'font-label-caps text-label-caps uppercase tracking-[0.18em] block mb-3',
            invert ? 'text-secondary-fixed' : 'text-secondary',
          )}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2
        id={titleId}
        className={cn(
          'font-display text-headline-lg tracking-tight',
          invert ? 'text-on-primary' : 'text-primary',
        )}
      >
        {title}
      </h2>
      {description ? (
        <div
          className={cn(
            'mt-4 font-sans text-body-lg font-light leading-relaxed',
            invert ? 'text-surface-container-highest' : 'text-on-surface-variant',
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}
