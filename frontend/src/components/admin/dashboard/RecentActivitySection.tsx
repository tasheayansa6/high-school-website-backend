import { DashboardSectionSkeleton } from '@/components/admin/dashboard/DashboardSectionSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDashboardRecentActivity } from '@/hooks/useDashboard';
import { formatActivityActor, formatActivityDescription } from '@/utils/activityLabel';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export function RecentActivitySection() {
  const query = useDashboardRecentActivity({ page: 1, limit: 12 });

  if (query.isLoading) {
    return <DashboardSectionSkeleton rows={5} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Unable to load recent activity.')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const items = data?.items ?? [];

  return (
    <section aria-labelledby="dashboard-activity-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="dashboard-activity-heading" className="font-display text-headline-sm text-primary">
          Recent activity
        </h2>
        {data ? (
          <p className="font-sans text-caption text-on-surface-variant">
            Showing {items.length.toLocaleString()} of {data.pagination.total.toLocaleString()}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Audit events will appear here when administrators make changes."
        />
      ) : (
        <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-4 md:px-5">
              <p className="font-sans text-body-md text-on-surface">
                {formatActivityDescription(item)}
              </p>
              <p className="mt-1 font-sans text-caption text-on-surface-variant">
                {formatPublishedDate(item.createdAt, 'en', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }) || 'Timestamp unavailable'}
                {' · '}
                {formatActivityActor(item)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
