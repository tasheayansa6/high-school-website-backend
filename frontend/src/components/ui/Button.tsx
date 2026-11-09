import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onPrimary';
export type ButtonSize = 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary-container disabled:bg-primary/50',
  secondary:
    'rounded-lg bg-secondary text-on-secondary shadow-sm hover:bg-secondary-container disabled:opacity-60',
  ghost:
    'rounded-lg border border-outline-variant/70 bg-transparent text-primary hover:border-primary/40 hover:bg-surface-container-low disabled:opacity-50',
  onPrimary:
    'rounded-lg bg-white/15 text-on-primary hover:bg-white/25 disabled:opacity-50',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'min-h-control-h px-5 py-2 text-label-caps',
  lg: 'min-h-btn-h px-7 py-3 text-label-caps',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  type = 'button',
  disabled,
  isLoading = false,
  ...rest
}: ButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type={type}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading ? true : undefined}
      className={cn(
        'inline-flex items-center justify-center font-label-caps uppercase tracking-widest transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
        'disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? t('common.pleaseWait') : children}
    </button>
  );
}
