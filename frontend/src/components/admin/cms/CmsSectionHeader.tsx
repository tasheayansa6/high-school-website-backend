import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

interface CmsSectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionTo?: string;
  actionLabel?: string;
  children?: ReactNode;
}

export function CmsSectionHeader({
  eyebrow = 'Content management',
  title,
  description,
  actionTo,
  actionLabel,
  children,
}: CmsSectionHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-outline-variant/40 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
          {eyebrow}
        </p>
        <h1 className="font-display text-headline-md text-primary">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl font-sans text-body-md text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {actionTo && actionLabel ? (
          <Link to={actionTo}>
            <Button type="button" variant="primary" size="md">
              {actionLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
