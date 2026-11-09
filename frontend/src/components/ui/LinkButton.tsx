import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import type { ButtonSize, ButtonVariant } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary-container',
  secondary: 'rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-secondary-container',
  ghost:
    'rounded-lg border border-outline-variant/70 bg-transparent text-primary hover:border-primary/40 hover:bg-surface-container-low',
  onPrimary: 'rounded-lg bg-white/15 text-on-primary hover:bg-white/25',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'min-h-control-h px-5 py-2.5',
  lg: 'min-h-btn-h px-7 py-3',
};

const baseClass =
  'inline-flex items-center justify-center font-label-caps text-label-caps uppercase tracking-widest transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary';

interface SharedLinkButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

interface RouterLinkButtonProps
  extends SharedLinkButtonProps, Omit<LinkProps, 'className' | 'children'> {
  to: LinkProps['to'];
  href?: never;
}

interface AnchorLinkButtonProps
  extends
    SharedLinkButtonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> {
  href: string;
  to?: never;
}

export type LinkButtonProps = RouterLinkButtonProps | AnchorLinkButtonProps;

export function LinkButton(props: LinkButtonProps) {
  const { variant = 'secondary', size = 'lg', className, children, ...rest } = props;
  const classes = cn(baseClass, variantClass[variant], sizeClass[size], className);

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...linkRest } = rest as RouterLinkButtonProps;
    return (
      <Link to={to} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { href, ...anchorRest } = rest as AnchorLinkButtonProps;
  return (
    <a href={href} className={classes} {...anchorRest}>
      {children}
    </a>
  );
}
