import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padded?: boolean;
};

export function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm',
        padded && 'p-6 md:p-7',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
