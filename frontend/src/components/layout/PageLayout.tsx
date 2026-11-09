import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface PageLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
}

/**
 * Shared page chrome. Header/footer slots are filled in later routing phases.
 */
export function PageLayout({
  header,
  footer,
  children,
  className,
  mainClassName,
}: PageLayoutProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-on-surface', className)}>
      {header}
      <main className={cn('flex-1', mainClassName)}>{children}</main>
      {footer}
    </div>
  );
}
