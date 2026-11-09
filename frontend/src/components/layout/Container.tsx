import type { ElementType, ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function Container({ children, className, as: Component = 'div' }: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full max-w-7xl px-margin-mobile md:px-margin', className)}>
      {children}
    </Component>
  );
}
