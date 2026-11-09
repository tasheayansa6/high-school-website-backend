import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { RemoteImage } from '@/components/content/RemoteImage';
import { Container } from '@/components/layout/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { blogDetailPath, PUBLIC_ROUTES } from '@/config/routes';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

const PAGE_SIZE = 3;

/** Fasilides-style Latest News strip with simple carousel controls. */
export function HomeNewsGrid() {
  const { t, i18n } = useTranslation();
  const blogsQuery = useBlogPosts({ page: 1, limit: 9 });
  const posts = blogsQuery.data?.items ?? [];
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => posts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [posts, safePage],
  );

  const goPrev = () => setPage((current) => Math.max(0, current - 1));
  const goNext = () => setPage((current) => Math.min(pageCount - 1, current + 1));

  return (
    <section id="news" className="scroll-mt-24 bg-white py-space-2xl">
      <Container>
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
            {t('home.bulletin.title')}
          </h2>
          <div className="flex items-center gap-3">
            <Link
              to={PUBLIC_ROUTES.news}
              className="font-sans text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t('home.bulletin.visitBlogs')}
            </Link>
            {posts.length > PAGE_SIZE ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={safePage === 0}
                  className="inline-flex h-9 w-9 items-center justify-center border border-outline-variant/60 text-on-surface transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                  aria-label={t('home.bulletin.prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={safePage >= pageCount - 1}
                  className="inline-flex h-9 w-9 items-center justify-center border border-outline-variant/60 text-on-surface transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                  aria-label={t('home.bulletin.next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {blogsQuery.isLoading ? <LoadingState message={t('blogs.loading')} /> : null}
        {blogsQuery.isError ? (
          <ErrorState
            message={getErrorMessage(blogsQuery.error, t('blogs.loadError'))}
            onRetry={() => void blogsQuery.refetch()}
          />
        ) : null}
        {blogsQuery.isSuccess && posts.length === 0 ? (
          <EmptyState
            title={t('home.bulletin.emptyTitle')}
            description={t('home.bulletin.emptyBody')}
          />
        ) : null}

        {visible.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {visible.map((post) => {
                const dateLabel = formatPublishedDate(post.publishedAt, i18n.language, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                });
                const author = post.author
                  ? `${post.author.firstName} ${post.author.lastName}`.trim()
                  : 'admin';
                return (
                  <li key={post.id} className="flex flex-col">
                    <Link to={blogDetailPath(post.slug)} className="block overflow-hidden">
                      <RemoteImage
                        image={post.featuredImage}
                        altFallback={post.title}
                        className="aspect-[16/11] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                    </Link>
                    <p className="mt-3 font-sans text-caption text-on-surface-variant">
                      {author} · {dateLabel || t('blogs.unpublished')}
                    </p>
                    <h3 className="mt-2 font-sans text-lg font-bold leading-snug text-on-surface">
                      <Link to={blogDetailPath(post.slug)} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h3>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-3 font-sans text-body-sm text-on-surface-variant">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <Link
                      to={blogDetailPath(post.slug)}
                      className="mt-3 font-sans text-sm font-bold text-on-surface hover:text-primary"
                    >
                      {t('blogs.readMore')}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {pageCount > 1 ? (
              <div
                className="mt-8 flex items-center justify-center gap-2"
                role="tablist"
                aria-label={t('home.bulletin.pages')}
              >
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={index === safePage}
                    aria-label={t('home.bulletin.goToPage', { page: index + 1 })}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition-colors',
                      index === safePage ? 'bg-primary' : 'bg-outline-variant/70 hover:bg-primary/50',
                    )}
                    onClick={() => setPage(index)}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Container>
    </section>
  );
}
