import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { RemoteImage } from '@/components/content/RemoteImage';
import { SafeHtml } from '@/components/content/SafeHtml';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useBlogDetail } from '@/hooks/useBlogDetail';
import { ApiClientError } from '@/services/api/apiError';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export default function BlogDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const detailQuery = useBlogDetail(slug);

  const isNotFound =
    detailQuery.error instanceof ApiClientError && detailQuery.error.status === 404;

  return (
    <Section tone="default" className="bg-surface">
      <Container className="max-w-3xl">
        <p className="mb-6">
          <Link
            to="/blogs"
            className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:text-primary"
          >
            {t('blogDetail.backToList')}
          </Link>
        </p>

        {detailQuery.isLoading ? <LoadingState message={t('blogDetail.loading')} /> : null}

        {detailQuery.isError && isNotFound ? (
          <EmptyState
            title={t('blogDetail.notFoundTitle')}
            description={t('blogDetail.notFoundDescription')}
          />
        ) : null}

        {detailQuery.isError && !isNotFound ? (
          <ErrorState
            message={getErrorMessage(detailQuery.error, t('blogDetail.loadError'))}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : null}

        {detailQuery.data ? (
          <article>
            <p className="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              {t('blogDetail.eyebrow')}
            </p>
            <h1 className="mb-4 break-words font-display text-headline-lg text-primary md:text-display-hero">
              {detailQuery.data.title}
            </h1>
            <p className="mb-8 font-sans text-body-md text-on-surface-variant">
              {formatPublishedDate(detailQuery.data.publishedAt, i18n.language)}
              {detailQuery.data.category ? ` · ${detailQuery.data.category.name}` : null}
              {detailQuery.data.author
                ? ` · ${detailQuery.data.author.firstName} ${detailQuery.data.author.lastName}`
                : null}
            </p>
            <RemoteImage
              image={detailQuery.data.featuredImage}
              altFallback={detailQuery.data.title}
              className="mb-10 aspect-[16/9] w-full"
            />
            {detailQuery.data.excerpt ? (
              <p className="mb-8 font-display text-title-editorial italic text-on-surface-variant">
                {detailQuery.data.excerpt}
              </p>
            ) : null}
            <SafeHtml html={detailQuery.data.content} />
          </article>
        ) : null}
      </Container>
    </Section>
  );
}
