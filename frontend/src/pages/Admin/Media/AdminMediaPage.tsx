import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { queryKeys } from '@/services/api/queryKeys';
import {
  deleteAdminMedia,
  listAdminMedia,
  restoreAdminMedia,
  updateAdminMedia,
  uploadAdminMedia,
} from '@/services/cms/adminMediaService';
import type { AdminMediaAsset, AdminMediaListQuery } from '@/types/cms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME_HINTS = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

type MimeFilter = NonNullable<AdminMediaListQuery['mimeType']> | '';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileLooksSupported(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} upload limit.`;
  }
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Supported uploads: JPEG, PNG, WebP, and PDF.';
  }
  if (file.type && !ALLOWED_MIME_HINTS.has(file.type)) {
    return 'Browser MIME type is not in the supported set (backend still validates file signatures).';
  }
  return null;
}

function isImageMime(mimeType: string) {
  return mimeType.startsWith('image/');
}

function isPdfMime(mimeType: string) {
  return mimeType === 'application/pdf';
}

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const canRestore = usePermission(PERMISSIONS.MEDIA_RESTORE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [previewBrokenIds, setPreviewBrokenIds] = useState<Record<number, true>>({});

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const q = searchParams.get('q') ?? '';
  const mimeType = (searchParams.get('mimeType') as MimeFilter) || '';
  const includeDeleted = searchParams.get('includeDeleted') === '1';

  const query = useMemo(
    () => ({
      page,
      limit: 24,
      ...(q ? { q } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(includeDeleted ? { includeDeleted: true } : {}),
      sortOrder: 'desc' as const,
    }),
    [page, q, mimeType, includeDeleted],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.cms.media.list(query),
    queryFn: ({ signal }) => listAdminMedia(query, { signal }),
    select: (response) => response.data,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.cms.media.all });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadAdminMedia(
        file,
        {},
        {
          onUploadProgress: (event) => {
            if (!event.total) {
              setUploadProgress(null);
              return;
            }
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          },
        },
      ),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setUploadProgress(null);
      setFileInputKey((current) => current + 1);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      setUploadProgress(null);
      setActionError(getErrorMessage(error, 'Unable to upload media.'));
      setFileInputKey((current) => current + 1);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      altText,
      description,
    }: {
      id: number;
      altText: string;
      description: string;
    }) =>
      updateAdminMedia(id, {
        altText: altText.trim() || null,
        description: description.trim() || null,
      }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setEditingId(null);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to update media metadata.'));
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'delete' | 'restore' }) => {
      if (action === 'restore') return restoreAdminMedia(id);
      return deleteAdminMedia(id);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDeleteId(null);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to complete media action.'));
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

  function onFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const clientError = fileLooksSupported(file);
    if (clientError) {
      setActionSuccess(null);
      setActionError(clientError);
      setFileInputKey((current) => current + 1);
      return;
    }
    setActionError(null);
    setUploadProgress(0);
    uploadMutation.mutate(file);
  }

  function beginEdit(item: AdminMediaAsset) {
    setEditingId(item.id);
    setEditAlt(item.altText ?? '');
    setEditDescription(item.description ?? '');
  }

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const busy = uploadMutation.isPending || updateMutation.isPending || actionMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        title="Media Library"
        description="Upload JPEG, PNG, WebP, or PDF files up to 5 MB. Content is served via authenticated API media URLs, not local disk paths."
      />

      <div className="mb-6 border border-outline-variant/40 bg-surface-container-lowest p-5">
        <FormField
          id="media-upload"
          label="Upload file"
          hint="Field name sent to the API: file. Backend validates actual file signatures."
        >
          <Input
            key={fileInputKey}
            id="media-upload"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            disabled={busy}
            onChange={(e) => onFileSelected(e.target.files)}
          />
        </FormField>
        {uploadProgress != null ? (
          <div className="mt-4" aria-live="polite">
            <div className="mb-1 flex justify-between text-caption text-on-surface-variant">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-surface-container-high">
              <div
                className="h-2 bg-secondary transition-[width]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <FormField id="media-q" label="Search">
          <Input id="media-q" value={q} onChange={(e) => updateParam('q', e.target.value)} />
        </FormField>
        <FormField id="media-mime" label="Type">
          <Select
            id="media-mime"
            value={mimeType}
            onChange={(e) => updateParam('mimeType', e.target.value)}
          >
            <option value="">All</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
            <option value="application/pdf">PDF</option>
          </Select>
        </FormField>
        <FormField id="media-deleted" label="Deleted">
          <Select
            id="media-deleted"
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
      {listQuery.isLoading ? <LoadingState message="Loading media…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load media library.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState title="No media found" description="Upload a file or adjust filters." />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const previewBroken = Boolean(previewBrokenIds[item.id]);
            return (
              <li
                key={item.id}
                className="border border-outline-variant/40 bg-surface-container-lowest p-4"
              >
                <div className="mb-3 flex h-40 items-center justify-center bg-surface-container-low">
                  {isImageMime(item.mimeType) && !previewBroken && !item.deletedAt ? (
                    <img
                      src={item.url}
                      alt={item.altText ?? item.originalName}
                      className="max-h-40 w-full object-contain"
                      loading="lazy"
                      onError={() =>
                        setPreviewBrokenIds((current) => ({ ...current, [item.id]: true }))
                      }
                    />
                  ) : isPdfMime(item.mimeType) && !item.deletedAt ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-body-sm text-primary underline"
                    >
                      Open PDF
                    </a>
                  ) : (
                    <span className="px-3 text-center font-sans text-caption text-on-surface-variant">
                      {item.deletedAt
                        ? 'Soft-deleted — public content unavailable'
                        : previewBroken
                          ? 'Preview unavailable'
                          : item.mimeType}
                    </span>
                  )}
                </div>

                <p className="truncate font-sans text-body-sm text-on-surface">
                  {item.originalName}
                </p>
                <p className="mt-1 text-caption text-on-surface-variant">
                  ID {item.id} · {item.mimeType} · {formatBytes(item.fileSize)}
                </p>
                <p className="text-caption text-on-surface-variant">
                  Uploaded{' '}
                  {formatPublishedDate(item.createdAt, 'en', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) || '—'}
                </p>
                {item.altText ? (
                  <p className="mt-1 truncate text-caption text-on-surface-variant">
                    Alt: {item.altText}
                  </p>
                ) : null}

                {editingId === item.id ? (
                  <div className="mt-3 space-y-3 border-t border-outline-variant/30 pt-3">
                    <FormField id={`alt-${item.id}`} label="Alt text">
                      <Input
                        id={`alt-${item.id}`}
                        value={editAlt}
                        disabled={busy}
                        onChange={(e) => setEditAlt(e.target.value)}
                      />
                    </FormField>
                    <FormField id={`desc-${item.id}`} label="Description">
                      <Input
                        id={`desc-${item.id}`}
                        value={editDescription}
                        disabled={busy}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </FormField>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={busy}
                        isLoading={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: item.id,
                            altText: editAlt,
                            description: editDescription,
                          })
                        }
                      >
                        Save metadata
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!item.deletedAt ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => beginEdit(item)}
                        >
                          Edit metadata
                        </Button>
                        {isImageMime(item.mimeType) || isPdfMime(item.mimeType) ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="ghost" size="md">
                              Open
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => setPendingDeleteId(item.id)}
                        >
                          Delete
                        </Button>
                      </>
                    ) : null}
                    {item.deletedAt && canRestore ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        disabled={busy}
                        onClick={() => actionMutation.mutate({ id: item.id, action: 'restore' })}
                      >
                        Restore
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
        title="Soft-delete this media asset?"
        description="Soft-deleted media is blocked from public content URLs. Assets referenced by published posts or events may be rejected by the backend. Restore requires MEDIA_RESTORE (Super Admin)."
        confirmLabel="Delete media"
        busy={actionMutation.isPending}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId != null) {
            actionMutation.mutate({ id: pendingDeleteId, action: 'delete' });
          }
        }}
      />
    </div>
  );
}
