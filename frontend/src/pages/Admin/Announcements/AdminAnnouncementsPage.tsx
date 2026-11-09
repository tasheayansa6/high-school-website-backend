import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useClassOfferingOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from '@/services/sms/announcementService';
import {
  type Announcement,
  ANNOUNCEMENT_AUDIENCES,
  type AnnouncementAudience,
} from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatDateTime } from '@/utils/opsFormat';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  body: z.string().trim().min(1, 'Body is required').max(50000),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  classOfferingId: z.string(),
  isPublished: z.boolean(),
});

type FormValues = z.input<typeof schema>;

const EMPTY_VALUES: FormValues = {
  title: '',
  body: '',
  audience: 'ALL',
  classOfferingId: '',
  isPublished: false,
};

const PAGE_SIZE = 20;

interface Filters {
  audience: '' | AnnouncementAudience;
  isPublished: '' | 'true' | 'false';
}

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [pendingPublish, setPendingPublish] = useState<Announcement | null>(null);
  const [filters, setFilters] = useState<Filters>({ audience: '', isPublished: '' });
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useClassOfferingOptions();

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(filters.audience ? { audience: filters.audience } : {}),
    ...(filters.isPublished ? { isPublished: filters.isPublished === 'true' } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.announcements.list({ ...query }),
    queryFn: ({ signal }) => listAnnouncements(query, { signal }),
    select: (response) => response.data,
  });
  const items = listQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });
  const audience = useWatch({ control, name: 'audience' });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sms.announcements.all });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = schema.parse(values);
      const classOfferingId = parsed.audience === 'CLASS' ? Number(parsed.classOfferingId) : null;
      if (editing) {
        return updateAnnouncement(editing.id, {
          title: parsed.title,
          body: parsed.body,
          audience: parsed.audience,
          classOfferingId,
        });
      }
      return createAnnouncement({
        title: parsed.title,
        body: parsed.body,
        audience: parsed.audience,
        ...(classOfferingId ? { classOfferingId } : {}),
        isPublished: parsed.isPublished,
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setEditing(null);
      reset(EMPTY_VALUES);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      if (!applyApiFieldErrors(error, setError)) {
        setActionError(getErrorMessage(error, 'Unable to save the announcement.'));
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishAnnouncement(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingPublish(null);
      await invalidate();
    },
    onError: (error) => {
      setPendingPublish(null);
      setActionError(getErrorMessage(error, 'Unable to publish the announcement.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      if (editing?.id === response.data.announcement.id) {
        setEditing(null);
        reset(EMPTY_VALUES);
      }
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete the announcement.'));
    },
  });

  function startEdit(item: Announcement) {
    setEditing(item);
    setActionSuccess(null);
    reset({
      title: item.title,
      body: item.body,
      audience: item.audience,
      classOfferingId: item.classOfferingId ? String(item.classOfferingId) : '',
      isPublished: item.isPublished,
    });
  }

  function cancelEdit() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const busy = isSubmitting || saveMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Announcements"
        description="Draft announcements and publish them to everyone, teachers, students, or a single class."
      />

      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}
      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? 'Edit announcement' : 'New announcement'}
          </h2>
          <FormField id="ann-title" label="Title" required error={errors.title?.message}>
            <Input
              id="ann-title"
              disabled={busy}
              hasError={Boolean(errors.title)}
              {...register('title')}
            />
          </FormField>
          <FormField id="ann-body" label="Body" required error={errors.body?.message}>
            <Textarea id="ann-body" rows={6} disabled={busy} {...register('body')} />
          </FormField>
          <FormField id="ann-audience" label="Audience" error={errors.audience?.message}>
            <Select id="ann-audience" disabled={busy} {...register('audience')}>
              {ANNOUNCEMENT_AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
          {audience === 'CLASS' ? (
            <FormField
              id="ann-class"
              label="Class"
              required
              error={errors.classOfferingId?.message}
            >
              <Select id="ann-class" disabled={busy} {...register('classOfferingId')}>
                <option value="">Select class</option>
                {(classes.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          {!editing ? (
            <Checkbox
              id="ann-published"
              label="Publish immediately"
              disabled={busy}
              {...register('isPublished')}
            />
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save changes' : 'Create announcement'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={cancelEdit} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField id="ann-filter-audience" label="Audience">
              <Select
                id="ann-filter-audience"
                value={filters.audience}
                onChange={(e) => updateFilter('audience', e.target.value as Filters['audience'])}
              >
                <option value="">All audiences</option>
                {ANNOUNCEMENT_AUDIENCES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="ann-filter-published" label="State">
              <Select
                id="ann-filter-published"
                value={filters.isPublished}
                onChange={(e) =>
                  updateFilter('isPublished', e.target.value as Filters['isPublished'])
                }
              >
                <option value="">All</option>
                <option value="true">Published</option>
                <option value="false">Drafts</option>
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading announcements…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load announcements.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No announcements found"
              description="Create an announcement or adjust the filters."
            />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
                      {item.title}
                      <StatusBadge status={item.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.audience}
                      {item.classOffering ? ` · ${item.classOffering.name}` : ''}
                      {item.publishedAt ? ` · Published ${formatDateTime(item.publishedAt)}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
                      {item.body}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.isPublished ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={() => setPendingPublish(item)}
                      >
                        Publish
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="md" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPendingDelete(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={pendingPublish !== null}
        title="Publish this announcement?"
        description={
          pendingPublish ? `"${pendingPublish.title}" will become visible to its audience.` : ''
        }
        confirmLabel="Publish"
        busy={publishMutation.isPending}
        onCancel={() => setPendingPublish(null)}
        onConfirm={() => {
          if (pendingPublish) publishMutation.mutate(pendingPublish.id);
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this announcement?"
        description={pendingDelete ? `"${pendingDelete.title}" will be removed.` : ''}
        confirmLabel="Delete"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
