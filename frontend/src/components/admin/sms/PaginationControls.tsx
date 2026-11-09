import { Button } from '@/components/ui/Button';
import type { PaginationMeta } from '@/services/api/apiTypes';

interface PaginationControlsProps {
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}

/** Previous / next pager shared by SMS list pages. Hidden when there is a single page. */
export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
      <Button
        type="button"
        variant="ghost"
        size="md"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        Previous
      </Button>
      <span className="text-body-sm text-on-surface-variant">
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
      </span>
      <Button
        type="button"
        variant="ghost"
        size="md"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
