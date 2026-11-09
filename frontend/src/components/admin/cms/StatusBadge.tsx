import { cn } from '@/utils/cn';

const toneClass: Record<string, string> = {
  DRAFT: 'bg-surface-container-high text-on-surface-variant',
  PUBLISHED: 'bg-primary-fixed text-on-primary-fixed',
  ARCHIVED: 'bg-outline-variant/40 text-on-surface-variant',
  CANCELLED: 'bg-error-container text-on-error-container',
  ACTIVE: 'bg-primary-fixed text-on-primary-fixed',
  CURRENT: 'bg-primary-fixed text-on-primary-fixed',
  INACTIVE: 'bg-surface-container-high text-on-surface-variant',
  COMPLETED: 'bg-secondary-container text-on-secondary-container',
  TRANSFERRED: 'bg-surface-container-high text-on-surface-variant',
  WITHDRAWN: 'bg-error-container text-on-error-container',
  DELETED: 'bg-error-container text-on-error-container',
  PRESENT: 'bg-primary-fixed text-on-primary-fixed',
  ABSENT: 'bg-error-container text-on-error-container',
  LATE: 'bg-secondary-container text-on-secondary-container',
  EXCUSED: 'bg-surface-container-high text-on-surface-variant',
  PAID: 'bg-primary-fixed text-on-primary-fixed',
  PARTIAL: 'bg-secondary-container text-on-secondary-container',
  UNPAID: 'bg-error-container text-on-error-container',
  WAIVED: 'bg-surface-container-high text-on-surface-variant',
  SUBMITTED: 'bg-secondary-container text-on-secondary-container',
  GRADED: 'bg-primary-fixed text-on-primary-fixed',
  RETURNED: 'bg-surface-container-high text-on-surface-variant',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex px-2 py-1 font-label-caps text-label-caps uppercase tracking-wider',
        toneClass[status] ?? 'bg-surface-container-high text-on-surface-variant',
        className,
      )}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
