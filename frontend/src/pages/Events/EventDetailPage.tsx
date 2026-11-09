import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { RemoteImage } from '@/components/content/RemoteImage';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useEventDetail } from '@/hooks/useEventDetail';
import { ApiClientError } from '@/services/api/apiError';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatEventRange } from '@/utils/formatDate';

export default function EventDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const detailQuery = useEventDetail(slug);
  const isNotFound =
    detailQuery.error instanceof ApiClientError && detailQuery.error.status === 404;

  return (
    <Section tone="default" className="bg-surface">
      <Container className="max-w-3xl">
        <p className="mb-6">
          <Link
            to="/events"
            className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:text-primary"
          >
            {t('eventDetail.backToList')}
          </Link>
        </p>

        {detailQuery.isLoading ? <LoadingState message={t('eventDetail.loading')} /> : null}

        {detailQuery.isError && isNotFound ? (
          <EmptyState
            title={t('eventDetail.notFoundTitle')}
            description={t('eventDetail.notFoundDescription')}
          />
        ) : null}

        {detailQuery.isError && !isNotFound ? (
          <ErrorState
            message={getErrorMessage(detailQuery.error, t('eventDetail.loadError'))}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : null}

        {detailQuery.data ? (
          <article>
            <p className="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              {t('eventDetail.eyebrow')}
            </p>
            <h1 className="mb-4 break-words font-display text-headline-lg text-primary">
              {detailQuery.data.title}
            </h1>
            <p className="mb-2 font-sans text-body-md text-on-surface-variant">
              {formatEventRange(detailQuery.data.startsAt, detailQuery.data.endsAt, i18n.language)}
            </p>
            {detailQuery.data.location ? (
              <p className="mb-8 font-sans text-body-md text-on-surface-variant">
                {detailQuery.data.location}
              </p>
            ) : (
              <div className="mb-8" />
            )}
            <RemoteImage
              image={detailQuery.data.featuredImage}
              altFallback={detailQuery.data.title}
              className="mb-10 aspect-[16/9] w-full"
            />
            {detailQuery.data.description ? (
              <p className="whitespace-pre-wrap font-sans text-body-lg text-on-surface-variant">
                {detailQuery.data.description}
              </p>
            ) : null}
          </article>
        ) : null}
      </Container>
    </Section>
  );
}
