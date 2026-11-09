import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { SafeHtml } from '@/components/content/SafeHtml';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePageDetail } from '@/hooks/usePageDetail';
import { ApiClientError } from '@/services/api/apiError';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

/**
 * Backend-managed CMS page by slug.
 * Designed Stitch routes (/about, /feature, …) are unchanged; this route is `/content/:slug`.
 */
export default function CmsPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const pageQuery = usePageDetail(slug);
  const isNotFound = pageQuery.error instanceof ApiClientError && pageQuery.error.status === 404;

  return (
    <Section tone="default" className="bg-surface">
      <Container className="max-w-3xl">
        <p className="mb-6">
          <Link
            to="/"
            className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:text-primary"
          >
            {t('common.returnHome')}
          </Link>
        </p>

        {pageQuery.isLoading ? <LoadingState message={t('cms.loading')} /> : null}

        {pageQuery.isError && isNotFound ? (
          <EmptyState title={t('cms.notFoundTitle')} description={t('cms.notFoundDescription')} />
        ) : null}

        {pageQuery.isError && !isNotFound ? (
          <ErrorState
            message={getErrorMessage(pageQuery.error, t('cms.loadError'))}
            onRetry={() => void pageQuery.refetch()}
          />
        ) : null}

        {pageQuery.data ? (
          <article>
            <p className="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              {t('cms.eyebrow')}
            </p>
            <h1 className="mb-4 break-words font-display text-headline-lg text-primary">
              {pageQuery.data.title}
            </h1>
            {pageQuery.data.publishedAt ? (
              <p className="mb-8 font-sans text-body-sm text-on-surface-variant">
                {formatPublishedDate(pageQuery.data.publishedAt, i18n.language)}
              </p>
            ) : null}
            <SafeHtml html={pageQuery.data.content} />
          </article>
        ) : null}
      </Container>
    </Section>
  );
}
