import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
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
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from '@/services/cms/adminBlogService';
import type { AdminBlogCategory } from '@/types/cms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

type CategoryFormValues = z.input<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminBlogCategory | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.cms.categories.list({}),
    queryFn: ({ signal }) => listAdminCategories({}, { signal }),
    select: (response) => response.data.categories,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', description: '' },
  });

  function startEdit(category: AdminBlogCategory) {
    setEditing(category);
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
    });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    reset({ name: '', slug: '', description: '' });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const parsed = categorySchema.parse(values);
      const body = {
        name: parsed.name,
        description:
          parsed.description && parsed.description.length > 0 ? parsed.description : null,
        ...(parsed.slug && parsed.slug.length > 0 ? { slug: parsed.slug } : {}),
      };
      if (editing) return updateAdminCategory(editing.id, body);
      return createAdminCategory(body);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.categories.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save category.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCategory(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.categories.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to delete category.'));
      setPendingDeleteId(null);
    },
  });

  const busy = isSubmitting || saveMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CmsSectionHeader
        title="Blog Categories"
        description="Categories associated with posts cannot be deleted until posts are reassigned or removed."
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
            {editing ? `Edit: ${editing.name}` : 'Create category'}
          </h2>
          <FormField id="cat-name" label="Name" required error={errors.name?.message}>
            <Input id="cat-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField id="cat-slug" label="Slug" hint="Optional" error={errors.slug?.message}>
            <Input id="cat-slug" disabled={busy} {...register('slug')} />
          </FormField>
          <FormField id="cat-description" label="Description" error={errors.description?.message}>
            <Textarea id="cat-description" rows={3} disabled={busy} {...register('description')} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save category' : 'Create category'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          {listQuery.isLoading ? <LoadingState message="Loading categories…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load categories.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && (listQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No categories yet"
              description="Create a category to organize posts."
            />
          ) : null}
          {(listQuery.data ?? []).length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {(listQuery.data ?? []).map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                >
                  <div>
                    <p className="font-sans text-body-md text-primary">{category.name}</p>
                    <p className="text-caption text-on-surface-variant">/{category.slug}</p>
                    <p className="mt-1 text-caption text-on-surface-variant">
                      Posts: {category.postCount ?? 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => startEdit(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPendingDeleteId(category.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Category restore is not provided by the backend. Soft-deleted categories remain
            unavailable in this UI.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this category?"
        description="Deletion fails if the category still has associated posts (CATEGORY_IN_USE)."
        confirmLabel="Delete category"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId != null) deleteMutation.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
