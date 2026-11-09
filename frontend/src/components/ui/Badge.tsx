import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

type BadgeTone = 'primary' | 'secondary' | 'surface';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneClass: Record<BadgeTone, string> = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  surface: 'bg-surface-container-high text-on-surface',
};

export function Badge({ children, tone = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-3 py-1 font-label-caps text-label-caps uppercase tracking-wider',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
