import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
}

/** Lightweight placeholder for loading content. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-container-high/80', className)}
      aria-hidden
    />
  );
}
