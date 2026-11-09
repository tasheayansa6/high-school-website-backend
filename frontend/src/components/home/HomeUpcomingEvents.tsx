import { Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ASSETS } from '@/config/assets';
import { eventDetailPath, PUBLIC_ROUTES } from '@/config/routes';
import { useEvents } from '@/hooks/useEvents';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export function HomeUpcomingEvents() {
  const { t, i18n } = useTranslation();
  const eventsQuery = useEvents({ page: 1, limit: 6 });
  const now = Date.now();
  const upcoming =
    eventsQuery.data?.items.filter((event) => {
      const start = new Date(event.startsAt).getTime();
      const end = event.endsAt ? new Date(event.endsAt).getTime() : start;
      return !Number.isNaN(start) && end >= now;
    }) ?? [];
  const shown = upcoming.slice(0, 3);

  return (
    <section className="bg-white">
      <Container className="px-0 sm:px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 overflow-hidden lg:grid-cols-2">
          <div className="bg-secondary px-5 py-10 text-on-secondary sm:px-6 sm:py-12 md:px-10 md:py-14">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t('home.upcomingEvents.title')}
            </h2>

            {eventsQuery.isLoading ? (
              <div className="mt-8 text-white">
                <LoadingState message={t('events.loading')} />
              </div>
            ) : null}
            {eventsQuery.isError ? (
              <div className="mt-8">
                <ErrorState
                  message={getErrorMessage(eventsQuery.error, t('events.loadError'))}
                  onRetry={() => void eventsQuery.refetch()}
                />
              </div>
            ) : null}
            {eventsQuery.isSuccess && shown.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={t('events.empty.title')}
                  description={t('events.empty.description')}
                />
              </div>
            ) : null}

            {shown.length > 0 ? (
              <ul className="mt-8 space-y-5">
                {shown.map((event) => {
                  const day = formatPublishedDate(event.startsAt, i18n.language, {
                    day: '2-digit',
                  });
                  const month = formatPublishedDate(event.startsAt, i18n.language, {
                    month: 'short',
                  });
                  const time = formatPublishedDate(event.startsAt, i18n.language, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <li key={event.id} className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-white text-primary">
                        <span className="font-display text-xl font-semibold leading-none">{day}</span>
                        <span className="font-sans text-[0.65rem] font-bold uppercase">{month}</span>
                      </div>
                      <div className="min-w-0 text-white">
                        <Link
                          to={eventDetailPath(event.slug)}
                          className="font-sans text-base font-bold hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-sans text-caption text-white/85">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            {time}
                          </span>
                          {event.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden />
                              {event.location}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <Link
              to={PUBLIC_ROUTES.events}
              className="mt-8 inline-block font-sans text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              {t('home.upcomingEvents.viewAll')}
            </Link>
          </div>

          <div className="relative min-h-[18rem] overflow-hidden lg:min-h-full">
            <img
              src={ASSETS.subjects.english}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-brand-evergreen/20" aria-hidden />
          </div>
        </div>
      </Container>
    </section>
  );
}
