import { DashboardSectionSkeleton } from '@/components/admin/dashboard/DashboardSectionSkeleton';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDashboardOverview } from '@/hooks/useDashboard';
import { getErrorMessage } from '@/utils/apiMessage';

export function OverviewStatsSection() {
  const query = useDashboardOverview();

  if (query.isLoading) {
    return <DashboardSectionSkeleton rows={4} className="grid grid-cols-1 gap-4 md:grid-cols-2" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Unable to load overview statistics.')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const overview = query.data;
  if (!overview) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-overview-heading">
      <h2
        id="dashboard-overview-heading"
        className="mb-4 font-display text-headline-sm text-primary"
      >
        Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published pages"
          value={overview.pages.published}
          hint={`${overview.pages.draft.toLocaleString()} draft`}
          icon="description"
        />
        <StatCard
          label="Published posts"
          value={overview.blogPosts.published}
          hint={`${overview.blogPosts.draft.toLocaleString()} draft`}
          icon="article"
        />
        <StatCard
          label="Upcoming events"
          value={overview.events.upcomingPublished}
          hint="Published events starting later"
          icon="event"
        />
        <StatCard label="Media assets" value={overview.mediaAssets.total} icon="photo_library" />
        <StatCard
          label="Contact messages"
          value={overview.contactMessages.total}
          hint={`${overview.contactMessages.new.toLocaleString()} new`}
          icon="mail"
        />
        <StatCard
          label="Admissions inquiries"
          value={overview.admissionInquiries.total}
          hint={`${overview.admissionInquiries.new.toLocaleString()} new`}
          icon="school"
        />
        <StatCard
          label="Newsletter subscribers"
          value={overview.newsletterSubscribers.total}
          hint={`${overview.newsletterSubscribers.active.toLocaleString()} active · ${overview.newsletterSubscribers.pending.toLocaleString()} pending`}
          icon="campaign"
        />
      </div>
    </section>
  );
}
