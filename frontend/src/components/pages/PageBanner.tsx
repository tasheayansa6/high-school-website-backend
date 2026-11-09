import type { ReactNode } from 'react';

import { Container } from '@/components/layout/Container';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { cn } from '@/utils/cn';

interface PageBannerProps {
  eyebrow: string;
  icon?: string;
  title: string;
  description?: ReactNode;
  className?: string;
}

/** Primary full-bleed page intro used on Contact, Pricing, and similar public pages. */
export function PageBanner({ eyebrow, icon, title, description, className }: PageBannerProps) {
  return (
    <section className={cn('bg-primary text-on-primary', className)}>
      <Container className="py-16 text-center md:py-20">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-primary-container/80 px-4 py-1.5 font-label-caps text-label-caps uppercase tracking-wider text-secondary-fixed">
          {icon ? <MaterialIcon name={icon} className="text-[16px]" /> : null}
          {eyebrow}
        </span>
        <h1 className="mb-4 font-display text-display-hero text-on-primary">{title}</h1>
        {description ? (
          <div className="mx-auto max-w-2xl font-sans text-body-lg text-surface-container-highest">
            {description}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
