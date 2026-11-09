import { DashboardSectionSkeleton } from '@/components/admin/dashboard/DashboardSectionSkeleton';
import { StatusBreakdownBars } from '@/components/admin/dashboard/StatusBreakdownBars';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDashboardContentStatistics } from '@/hooks/useDashboard';
import { getErrorMessage } from '@/utils/apiMessage';

export function ContentStatisticsSection() {
  const query = useDashboardContentStatistics();

  if (query.isLoading) {
    return <DashboardSectionSkeleton rows={4} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Unable to load content statistics.')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const statistics = query.data;
  if (!statistics) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-content-heading" className="space-y-8">
      <div>
        <h2
          id="dashboard-content-heading"
          className="mb-2 font-display text-headline-sm text-primary"
        >
          Content statistics
        </h2>
        <p className="font-sans text-body-sm text-on-surface-variant">
          Status breakdowns from published and draft content in MySQL. Blog categories:{' '}
          <span className="tabular-nums text-primary">
            {statistics.blogCategories.total.toLocaleString()}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <StatusBreakdownBars
          title="Pages"
          total={statistics.pages.total}
          byStatus={statistics.pages.byStatus}
          emptyTitle="No pages yet"
          emptyDescription="Page status counts will appear when CMS pages exist."
          className="border border-outline-variant/40 bg-surface-container-lowest p-5"
        />
        <StatusBreakdownBars
          title="Blog posts"
          total={statistics.blogPosts.total}
          byStatus={statistics.blogPosts.byStatus}
          emptyTitle="No blog posts yet"
          emptyDescription="Post status counts will appear when bulletin posts exist."
          className="border border-outline-variant/40 bg-surface-container-lowest p-5"
        />
        <StatusBreakdownBars
          title="Events"
          total={statistics.events.total}
          byStatus={statistics.events.byStatus}
          emptyTitle="No events yet"
          emptyDescription="Event status counts will appear when events exist."
          className="border border-outline-variant/40 bg-surface-container-lowest p-5"
        />
      </div>
    </section>
  );
}
