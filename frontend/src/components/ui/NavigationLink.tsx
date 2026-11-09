import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';

import { cn } from '@/utils/cn';

type NavigationLinkVariant = 'header' | 'headerMobile' | 'footer';

type NavigationLinkProps = Omit<NavLinkProps, 'className' | 'children'> & {
  children: ReactNode;
  variant?: NavigationLinkVariant;
  className?: string;
};

const variantClass: Record<NavigationLinkVariant, (isActive: boolean) => string> = {
  header: (isActive) =>
    cn(
      'relative inline-flex items-center gap-1 font-sans text-[0.95rem] tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
      isActive
        ? 'font-medium text-secondary'
        : 'text-on-surface hover:text-secondary',
    ),
  headerMobile: (isActive) =>
    cn(
      'block border-l-2 px-5 py-3.5 font-sans text-body-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
      isActive
        ? 'border-secondary bg-secondary-container/30 font-semibold text-secondary'
        : 'border-transparent text-on-surface hover:bg-surface-container-low',
    ),
  footer: () =>
    'font-sans text-body-sm text-surface-container-highest transition-colors hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-fixed',
};

export function NavigationLink({
  children,
  variant = 'header',
  className,
  ...rest
}: NavigationLinkProps) {
  return (
    <NavLink {...rest} className={({ isActive }) => cn(variantClass[variant](isActive), className)}>
      {children}
    </NavLink>
  );
}
