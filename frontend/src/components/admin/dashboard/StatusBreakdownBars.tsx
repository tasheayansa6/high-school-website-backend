import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

interface StatusBreakdownBarsProps {
  title: string;
  total: number;
  byStatus: Record<string, number>;
  emptyTitle: string;
  emptyDescription: string;
  className?: string;
}

/** Accessible CSS bars — no chart library; values come only from the API. */
export function StatusBreakdownBars({
  title,
  total,
  byStatus,
  emptyTitle,
  emptyDescription,
  className,
}: StatusBreakdownBarsProps) {
  const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);

  if (total === 0 || entries.length === 0) {
    return (
      <div className={className}>
        <h3 className="mb-3 font-display text-headline-sm text-primary">{title}</h3>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <div className={cn(className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-headline-sm text-primary">{title}</h3>
        <p className="font-sans text-caption text-on-surface-variant">
          Total {total.toLocaleString()}
        </p>
      </div>
      <ul className="space-y-3" aria-label={`${title} by status`}>
        {entries.map(([status, count]) => {
          const widthPercent = Math.max((count / max) * 100, 4);
          return (
            <li key={status}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                  {status.replaceAll('_', ' ')}
                </span>
                <span className="font-sans text-body-sm tabular-nums text-primary">
                  {count.toLocaleString()}
                </span>
              </div>
              <div
                className="h-2 w-full bg-surface-container-high"
                role="img"
                aria-label={`${status}: ${count} of ${total}`}
              >
                <div className="h-full bg-secondary" style={{ width: `${widthPercent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
