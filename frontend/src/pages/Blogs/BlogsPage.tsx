import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { RemoteImage } from '@/components/content/RemoteImage';
import { Container } from '@/components/layout/Container';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { blogDetailPath } from '@/config/routes';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import type { BlogPost } from '@/services/api/apiTypes';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

const PAGE_SIZE = 9;

function authorLabel(post: BlogPost): string {
  if (!post.author) return 'admin';
  const name = `${post.author.firstName} ${post.author.lastName}`.trim();
  return name || 'admin';
}

export default function BlogsPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const q = searchParams.get('q')?.trim() || undefined;

  const listQuery = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(q ? { q } : {}),
    }),
    [page, q],
  );

  const postsQuery = useBlogPosts(listQuery);
  const popularQuery = useBlogPosts({ page: 1, limit: 5 });

  const items = postsQuery.data?.items ?? [];
  const popular = popularQuery.data?.items ?? [];
  const pagination = postsQuery.data?.pagination;

  useEffect(() => {
    if (searchParams.get('focus') === 'search') {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  function setPage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  }

  function applySearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.delete('page');
    const next = searchDraft.trim();
    if (next) params.set('q', next);
    else params.delete('q');
    setSearchParams(params);
  }

  return (
    <div className="bg-white text-on-surface">
      <Container className="pt-10 pb-6 md:pt-12">
        <PageBreadcrumb current={t('nav.news')} />
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {t('nav.news')}
          </h1>
          <form
            onSubmit={applySearch}
            className="flex w-full max-w-sm items-center gap-2 border-b border-outline-variant/60 pb-1 sm:flex-1"
            role="search"
          >
            <label className="sr-only" htmlFor="blog-search">
              {t('blogs.searchLabel')}
            </label>
            <input
              ref={searchInputRef}
              id="blog-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t('blogs.searchPlaceholder')}
              className="min-h-11 w-full min-w-0 bg-transparent font-sans text-base outline-none placeholder:text-on-surface-variant sm:min-h-9 sm:text-body-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center font-sans text-sm font-semibold text-primary"
            >
              {t('blogs.searchSubmit')}
            </button>
          </form>
        </div>
      </Container>

      <Container className="pb-16">
        {postsQuery.isLoading ? <LoadingState message={t('blogs.loading')} /> : null}
        {postsQuery.isError ? (
          <ErrorState
            message={getErrorMessage(postsQuery.error, t('blogs.loadError'))}
            onRetry={() => void postsQuery.refetch()}
          />
        ) : null}
        {postsQuery.isSuccess && items.length === 0 ? (
          <EmptyState title={t('blogs.empty.title')} description={t('blogs.empty.description')} />
        ) : null}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3">
              {items.map((post) => {
                const publishedLabel = formatPublishedDate(post.publishedAt, i18n.language, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <li key={post.id} className="flex flex-col">
                    <Link to={blogDetailPath(post.slug)} className="block overflow-hidden bg-surface-container">
                      <RemoteImage
                        image={post.featuredImage}
                        altFallback={post.title}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-surface-container-high px-2 py-0.5 font-sans text-caption text-on-surface-variant">
                        {authorLabel(post)}
                      </span>
                      {publishedLabel ? (
                        <span className="bg-surface-container-high px-2 py-0.5 font-sans text-caption text-on-surface-variant">
                          {publishedLabel}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 font-sans text-lg font-bold leading-snug text-on-surface">
                      <Link to={blogDetailPath(post.slug)} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-3 font-sans text-body-sm text-on-surface-variant">
                        {post.excerpt}{' '}
                        <Link
                          to={blogDetailPath(post.slug)}
                          className="font-bold text-on-surface hover:text-primary"
                        >
                          {t('blogs.readMore', { defaultValue: 'Read More' })}
                        </Link>
                      </p>
                    ) : (
                      <Link
                        to={blogDetailPath(post.slug)}
                        className="mt-2 font-sans text-sm font-bold text-on-surface hover:text-primary"
                      >
                        {t('blogs.readMore', { defaultValue: 'Read More' })}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            <aside className="lg:col-span-3">
              <div className="sticky top-28 border border-outline-variant/40 p-5">
                <h2 className="font-sans text-base font-bold text-on-surface">
                  {t('blogs.popular', { defaultValue: 'Popular Posts' })}
                </h2>
                <ul className="mt-4 space-y-4">
                  {popular.slice(0, 5).map((post) => (
                    <li key={post.id} className="flex gap-3">
                      <Link to={blogDetailPath(post.slug)} className="shrink-0">
                        <RemoteImage
                          image={post.featuredImage}
                          altFallback={post.title}
                          className="h-14 w-14 object-cover"
                        />
                      </Link>
                      <Link
                        to={blogDetailPath(post.slug)}
                        className="font-sans text-sm font-semibold leading-snug text-on-surface hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        ) : null}

        {pagination && pagination.totalPages > 1 ? (
          <nav
            className="mt-12 flex items-center justify-between gap-4 border-t border-outline-variant/40 pt-6"
            aria-label={t('blogs.paginationLabel')}
          >
            <button
              type="button"
              className="font-sans text-body-sm font-semibold text-primary disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← {t('blogs.prevPage')}
            </button>
            <p className="font-sans text-caption text-on-surface-variant">
              {t('blogs.pageStatus', { page, totalPages: pagination.totalPages })}
            </p>
            <button
              type="button"
              className="font-sans text-body-sm font-semibold text-primary disabled:opacity-40"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('blogs.nextPage')} →
            </button>
          </nav>
        ) : null}
      </Container>
    </div>
  );
}
