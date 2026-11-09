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
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '@/services/sms/catalogService';
import type { SmsSubject } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { emptyToNull } from '@/utils/smsFormat';

const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  code: z.string().trim().min(1, 'Code is required').max(50),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
});

type SubjectFormValues = z.input<typeof subjectSchema>;

const EMPTY_VALUES: SubjectFormValues = { name: '', code: '', description: '' };
const PAGE_SIZE = 20;

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SmsSubject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SmsSubject | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const query = { page, limit: PAGE_SIZE };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.subjects.list(query),
    queryFn: ({ signal }) => listSubjects(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: EMPTY_VALUES,
  });

  function startEdit(item: SmsSubject) {
    setEditing(item);
    reset({ name: item.name, code: item.code, description: item.description ?? '' });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: SubjectFormValues) => {
      const parsed = subjectSchema.parse(values);
      const body = {
        name: parsed.name,
        code: parsed.code,
        description: emptyToNull(parsed.description),
      };
      if (editing) return updateSubject(editing.id, body);
      return createSubject(body);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.subjects.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save subject.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      if (editing && pendingDelete?.id === editing.id) startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.subjects.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to delete subject.'));
      setPendingDelete(null);
    },
  });

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Subjects"
        description="Subjects assigned to a teacher cannot be deleted."
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
            {editing ? `Edit: ${editing.name}` : 'Create subject'}
          </h2>
          <FormField id="subject-name" label="Name" required error={errors.name?.message}>
            <Input id="subject-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField id="subject-code" label="Code" required error={errors.code?.message}>
            <Input id="subject-code" disabled={busy} {...register('code')} />
          </FormField>
          <FormField
            id="subject-description"
            label="Description"
            error={errors.description?.message}
          >
            <Textarea
              id="subject-description"
              rows={3}
              disabled={busy}
              {...register('description')}
            />
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save subject' : 'Create subject'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          {listQuery.isLoading ? <LoadingState message="Loading subjects…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load subjects.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No subjects yet"
              description="Create a subject to start assigning teachers."
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
                    {item.description ? (
                      <p className="mt-1 text-caption text-on-surface-variant">
                        {item.description}
                      </p>
                    ) : null}
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
            Restore is not provided by the backend for subjects.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this subject?"
        description={`${pendingDelete?.name ?? 'This subject'} will be soft-deleted. Deletion fails while teaching assignments still use it.`}
        confirmLabel="Delete subject"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
