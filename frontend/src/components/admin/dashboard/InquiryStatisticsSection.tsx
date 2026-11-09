import { DashboardSectionSkeleton } from '@/components/admin/dashboard/DashboardSectionSkeleton';
import { StatusBreakdownBars } from '@/components/admin/dashboard/StatusBreakdownBars';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDashboardInquiryStatistics } from '@/hooks/useDashboard';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export function InquiryStatisticsSection() {
  const query = useDashboardInquiryStatistics();

  if (query.isLoading) {
    return <DashboardSectionSkeleton rows={3} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Unable to load inquiry statistics.')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const statistics = query.data;
  if (!statistics) {
    return null;
  }

  const fromLabel = statistics.filters.from
    ? formatPublishedDate(statistics.filters.from, 'en')
    : null;
  const toLabel = statistics.filters.to ? formatPublishedDate(statistics.filters.to, 'en') : null;

  return (
    <section aria-labelledby="dashboard-inquiry-heading" className="space-y-6">
      <div>
        <h2
          id="dashboard-inquiry-heading"
          className="mb-2 font-display text-headline-sm text-primary"
        >
          Inquiry statistics
        </h2>
        <p className="font-sans text-body-sm text-on-surface-variant">
          {fromLabel || toLabel
            ? `Filtered range: ${fromLabel ?? '…'} – ${toLabel ?? '…'}`
            : 'All recorded contact messages and admissions inquiries (no date filter applied).'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdownBars
          title="Contact messages"
          total={statistics.contactMessages.total}
          byStatus={statistics.contactMessages.byStatus}
          emptyTitle="No contact messages"
          emptyDescription="Contact status counts will appear when visitors submit the contact form."
          className="border border-outline-variant/40 bg-surface-container-lowest p-5"
        />
        <StatusBreakdownBars
          title="Admissions inquiries"
          total={statistics.admissionInquiries.total}
          byStatus={statistics.admissionInquiries.byStatus}
          emptyTitle="No admissions inquiries"
          emptyDescription="Inquiry status counts will appear when families submit admissions forms."
          className="border border-outline-variant/40 bg-surface-container-lowest p-5"
        />
      </div>
    </section>
  );
}
