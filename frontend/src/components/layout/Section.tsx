import type { ElementType, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type SectionTone = 'default' | 'surface' | 'primary' | 'muted';

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  tone?: SectionTone;
  id?: string;
  'aria-labelledby'?: string;
}

const toneClass: Record<SectionTone, string> = {
  default: 'bg-transparent',
  surface: 'bg-surface',
  primary: 'bg-primary text-on-primary',
  muted: 'bg-surface-container-low',
};

export function Section({
  children,
  className,
  as: Component = 'section',
  tone = 'default',
  id,
  'aria-labelledby': ariaLabelledBy,
}: SectionProps) {
  return (
    <Component
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn('py-space-xl md:py-space-2xl', toneClass[tone], className)}
    >
      {children}
    </Component>
  );
}
