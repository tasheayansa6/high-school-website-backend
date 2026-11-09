import { Clock, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Container } from '@/components/layout/Container';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { eventDetailPath } from '@/config/routes';
import { useEvents } from '@/hooks/useEvents';
import type { SchoolEvent } from '@/services/api/apiTypes';
import { getErrorMessage } from '@/utils/apiMessage';
import { cn } from '@/utils/cn';
import { formatPublishedDate } from '@/utils/formatDate';

type EventTab = 'happening' | 'upcoming' | 'expired';

function classifyEvent(event: SchoolEvent, now: number): EventTab {
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 24 * 60 * 60 * 1000;
  if (Number.isNaN(start)) return 'upcoming';
  if (now >= start && now <= end) return 'happening';
  if (now < start) return 'upcoming';
  return 'expired';
}

function formatTimeRange(event: SchoolEvent, locale: string): string {
  const start = formatPublishedDate(event.startsAt, locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!event.endsAt) return start;
  const end = formatPublishedDate(event.endsAt, locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return end ? `${start} – ${end}` : start;
}

export default function EventsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<EventTab>('happening');
  const eventsQuery = useEvents({ page: 1, limit: 50 });
  const items = eventsQuery.data?.items ?? [];
  const now = Date.now();

  const grouped = useMemo(() => {
    const buckets: Record<EventTab, SchoolEvent[]> = {
      happening: [],
      upcoming: [],
      expired: [],
    };
    for (const event of items) {
      buckets[classifyEvent(event, now)].push(event);
    }
    return buckets;
  }, [items, now]);

  const visible = grouped[tab];

  const tabs: { id: EventTab; label: string }[] = [
    { id: 'happening', label: t('events.tabs.happening', { defaultValue: 'Happening' }) },
    { id: 'upcoming', label: t('events.tabs.upcoming', { defaultValue: 'Upcoming' }) },
    { id: 'expired', label: t('events.tabs.expired', { defaultValue: 'Expired' }) },
  ];

  return (
    <div className="bg-white">
      <Container className="pt-10 pb-6 md:pt-12">
        <PageBreadcrumb current={t('nav.events')} />
        <h1 className="font-display text-4xl font-semibold tracking-tight text-on-surface md:text-5xl">
          {t('events.title')}
        </h1>
      </Container>

      <Container className="pb-16">
        <div className="flex flex-wrap gap-6 border-b border-outline-variant/40" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                'pb-3 font-sans text-sm font-semibold transition-colors',
                tab === item.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {eventsQuery.isLoading ? (
          <div className="mt-10">
            <LoadingState message={t('events.loading')} />
          </div>
        ) : null}

        {eventsQuery.isError ? (
          <div className="mt-10">
            <ErrorState
              message={getErrorMessage(eventsQuery.error, t('events.loadError'))}
              onRetry={() => void eventsQuery.refetch()}
            />
          </div>
        ) : null}

        {eventsQuery.isSuccess && visible.length === 0 ? (
          <div className="mt-10">
            <EmptyState title={t('events.empty.title')} description={t('events.empty.description')} />
          </div>
        ) : null}

        {visible.length > 0 ? (
          <ul className="mt-8 divide-y divide-outline-variant/40">
            {visible.map((event) => {
              const day = formatPublishedDate(event.startsAt, i18n.language, { day: '2-digit' });
              const month = formatPublishedDate(event.startsAt, i18n.language, { month: 'short' });
              return (
                <li key={event.id} className="grid grid-cols-[5rem_1fr] gap-5 py-7 sm:grid-cols-[6.5rem_1fr] sm:gap-8">
                  <div className="text-center">
                    <p className="font-display text-3xl font-semibold leading-none text-primary sm:text-4xl">
                      {day}
                    </p>
                    <p className="mt-1 font-sans text-sm font-semibold text-primary uppercase">
                      {month}
                    </p>
                  </div>
                  <div>
                    <h2 className="font-sans text-xl font-bold text-on-surface">
                      <Link to={eventDetailPath(event.slug)} className="hover:text-primary">
                        {event.title}
                      </Link>
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-sans text-body-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatTimeRange(event, i18n.language)}
                      </span>
                      {event.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {event.location}
                        </span>
                      ) : null}
                    </div>
                    {event.description ? (
                      <p className="mt-3 max-w-3xl line-clamp-2 font-sans text-body-md text-on-surface-variant">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Container>
    </div>
  );
}
