import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { queryKeys } from '@/services/api/queryKeys';
import {
  deleteAdminPost,
  listAdminCategories,
  listAdminPosts,
  publishAdminPost,
  restoreAdminPost,
  unpublishAdminPost,
} from '@/services/cms/adminBlogService';
import type { PublicationStatus } from '@/types/cms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export default function AdminBlogsPage() {
  const queryClient = useQueryClient();
  const canRestore = usePermission(PERMISSIONS.BLOG_RESTORE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const q = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') as PublicationStatus | '') || '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const includeDeleted = searchParams.get('includeDeleted') === '1';

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(includeDeleted ? { includeDeleted: true } : {}),
      sortBy: 'updatedAt' as const,
      sortOrder: 'desc' as const,
    }),
    [page, q, status, categoryId, includeDeleted],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.cms.posts.list(query),
    queryFn: ({ signal }) => listAdminPosts(query, { signal }),
    select: (response) => response.data,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.cms.categories.list({}),
    queryFn: ({ signal }) => listAdminCategories({}, { signal }),
    select: (response) => response.data.categories,
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: number;
      action: 'publish' | 'unpublish' | 'delete' | 'restore';
    }) => {
      if (action === 'publish') return publishAdminPost(id);
      if (action === 'unpublish') return unpublishAdminPost(id);
      if (action === 'restore') return restoreAdminPost(id);
      return deleteAdminPost(id);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.posts.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to complete post action.'));
      setPendingDeleteId(null);
    },
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        title="Blog Posts"
        description="Manage academy bulletin posts. Categories and featured images come from the live CMS API."
        actionTo={ADMIN_ROUTES.blogNew}
        actionLabel="New post"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <FormField id="posts-q" label="Search">
          <Input id="posts-q" value={q} onChange={(e) => updateParam('q', e.target.value)} />
        </FormField>
        <FormField id="posts-status" label="Status">
          <Select
            id="posts-status"
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </FormField>
        <FormField id="posts-category" label="Category">
          <Select
            id="posts-category"
            value={categoryId}
            onChange={(e) => updateParam('categoryId', e.target.value)}
          >
            <option value="">All categories</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="posts-deleted" label="Deleted">
          <Select
            id="posts-deleted"
            value={includeDeleted ? '1' : ''}
            onChange={(e) => updateParam('includeDeleted', e.target.value)}
          >
            <option value="">Hide deleted</option>
            <option value="1">Include deleted</option>
          </Select>
        </FormField>
      </div>

      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}
      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}
      {listQuery.isLoading ? <LoadingState message="Loading posts…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load posts.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState title="No posts found" description="Create a post or adjust filters." />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
          <table className="min-w-full text-left">
            <thead className="border-b border-outline-variant/40 bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Title</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Category</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Updated</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-outline-variant/20 align-top">
                  <td className="px-4 py-3">
                    <Link
                      to={ADMIN_ROUTES.blogEdit(item.id)}
                      className="text-primary hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-caption text-on-surface-variant">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                    {item.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                    {formatPublishedDate(item.updatedAt, 'en') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link to={ADMIN_ROUTES.blogEdit(item.id)}>
                        <Button type="button" variant="ghost" size="md">
                          Edit
                        </Button>
                      </Link>
                      {!item.deletedAt && item.status !== 'PUBLISHED' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ id: item.id, action: 'publish' })}
                        >
                          Publish
                        </Button>
                      ) : null}
                      {!item.deletedAt && item.status === 'PUBLISHED' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ id: item.id, action: 'unpublish' })}
                        >
                          Unpublish
                        </Button>
                      ) : null}
                      {!item.deletedAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => setPendingDeleteId(item.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                      {item.deletedAt && canRestore ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ id: item.id, action: 'restore' })}
                        >
                          Restore
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-body-sm text-on-surface-variant">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={page >= pagination.totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Soft-delete this post?"
        description="The post will be soft-deleted. Super Admins can restore it when restore permission is available."
        confirmLabel="Delete post"
        busy={mutation.isPending}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId != null) mutation.mutate({ id: pendingDeleteId, action: 'delete' });
        }}
      />
    </div>
  );
}
