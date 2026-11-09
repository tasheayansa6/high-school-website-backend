import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createSection,
  deleteSection,
  listSections,
  updateSection,
} from '@/services/sms/catalogService';
import type { SmsSection } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';

const sectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  code: z.string().trim().min(1, 'Code is required').max(20),
});

type SectionFormValues = z.input<typeof sectionSchema>;

const EMPTY_VALUES: SectionFormValues = { name: '', code: '' };
const PAGE_SIZE = 20;

export default function AdminSectionsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SmsSection | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SmsSection | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const query = { page, limit: PAGE_SIZE };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.sections.list(query),
    queryFn: ({ signal }) => listSections(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: EMPTY_VALUES,
  });

  function startEdit(item: SmsSection) {
    setEditing(item);
    reset({ name: item.name, code: item.code });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: SectionFormValues) => {
      const parsed = sectionSchema.parse(values);
      const body = { name: parsed.name, code: parsed.code };
      if (editing) return updateSection(editing.id, body);
      return createSection(body);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.sections.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save section.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSection(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      if (editing && pendingDelete?.id === editing.id) startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.sections.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to delete section.'));
      setPendingDelete(null);
    },
  });

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Sections"
        description="Sections in use by a class offering cannot be deleted."
      />

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? `Edit: ${editing.name}` : 'Create section'}
          </h2>
          <FormField id="section-name" label="Name" required error={errors.name?.message}>
            <Input id="section-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField id="section-code" label="Code" required error={errors.code?.message}>
            <Input id="section-code" disabled={busy} {...register('code')} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save section' : 'Create section'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          {listQuery.isLoading ? <LoadingState message="Loading sections…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load sections.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No sections yet"
              description="Create a section to start building class offerings."
            />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                >
                  <div>
                    <p className="font-sans text-body-md text-primary">{item.name}</p>
                    <p className="text-caption text-on-surface-variant">Code {item.code}</p>
                  </div>
                  <div className="flex gap-2">
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
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Restore is not provided by the backend for sections.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this section?"
        description={`${pendingDelete?.name ?? 'This section'} will be soft-deleted. Deletion fails while class offerings still use it.`}
        confirmLabel="Delete section"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
