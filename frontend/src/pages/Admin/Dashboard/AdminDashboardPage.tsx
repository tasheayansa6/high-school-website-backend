import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ContentStatisticsSection } from '@/components/admin/dashboard/ContentStatisticsSection';
import { InquiryStatisticsSection } from '@/components/admin/dashboard/InquiryStatisticsSection';
import { OverviewStatsSection } from '@/components/admin/dashboard/OverviewStatsSection';
import { RecentActivitySection } from '@/components/admin/dashboard/RecentActivitySection';
import { SmsQuickLinksSection } from '@/components/admin/dashboard/SmsQuickLinksSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/services/api/queryKeys';
import { formatPublishedDate } from '@/utils/formatDate';

export default function AdminDashboardPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const welcomeName = useMemo(() => {
    if (!admin) {
      return null;
    }
    const fullName = `${admin.firstName} ${admin.lastName}`.trim();
    return fullName.length > 0 ? fullName : admin.email;
  }, [admin]);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      setLastRefreshedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl">
      <Card className="overflow-hidden border-none bg-primary p-0 text-on-primary shadow-md">
        <div className="flex flex-col gap-4 bg-[radial-gradient(circle_at_100%_0%,rgb(183_154_89/0.25),transparent_45%)] p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Administration
            </p>
            <h1 className="mb-2 break-words font-display text-headline-md text-on-primary">
              {welcomeName ? `Welcome, ${welcomeName}` : 'Dashboard'}
            </h1>
            <p className="max-w-2xl font-sans text-body-md text-on-primary/80">
              Live school metrics from the academy database — students, staff, content, and recent
              activity.
            </p>
            {admin ? (
              <p className="mt-2 font-sans text-caption text-on-primary/65">
                Signed in as {admin.email} · Admin
              </p>
            ) : null}
            {lastRefreshedAt ? (
              <p className="mt-1 font-sans text-caption text-on-primary/65">
                Last refreshed{' '}
                {formatPublishedDate(lastRefreshedAt.toISOString(), 'en', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="onPrimary"
            size="md"
            onClick={() => void onRefresh()}
            isLoading={isRefreshing}
            disabled={isRefreshing}
          >
            Refresh data
          </Button>
        </div>
      </Card>

      <OverviewStatsSection />
      <SmsQuickLinksSection />
      <RecentActivitySection />
      <ContentStatisticsSection />
      <InquiryStatisticsSection />
    </div>
  );
}
