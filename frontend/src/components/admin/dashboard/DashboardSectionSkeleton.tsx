import { cn } from '@/utils/cn';

interface DashboardSectionSkeletonProps {
  className?: string;
  rows?: number;
}

export function DashboardSectionSkeleton({ className, rows = 3 }: DashboardSectionSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard section"
      className={cn('animate-pulse space-y-3', className)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 border border-outline-variant/20 bg-surface-container-high/60"
        />
      ))}
    </div>
  );
}
