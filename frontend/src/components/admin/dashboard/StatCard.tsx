import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { cn } from '@/utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  icon: string;
  className?: string;
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <article
      className={cn(
        'rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <MaterialIcon name={icon} className="text-[20px]" />
        </span>
      </div>
      <p className="font-display text-headline-md text-primary tabular-nums">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="mt-2 font-sans text-caption text-on-surface-variant">{hint}</p> : null}
    </article>
  );
}
