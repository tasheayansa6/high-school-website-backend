import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
import { useTeacherClasses } from '@/hooks/useTeacherPortal';
import { endpoints } from '@/services/api/endpoints';
import { queryKeys } from '@/services/api/queryKeys';
import { getTeacherAccessToken } from '@/services/api/teacherAuthToken';
import {
  createTeacherLearningMaterial,
  deleteTeacherLearningMaterial,
  listTeacherLearningMaterials,
  publishTeacherLearningMaterial,
  unpublishTeacherLearningMaterial,
  updateTeacherLearningMaterial,
} from '@/services/teacher/teacherLearningMaterialService';
import {
  LEARNING_MATERIAL_CATEGORIES,
  LEARNING_MATERIAL_CATEGORY_LABELS,
  type LearningMaterial,
} from '@/types/learningMaterial.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { downloadAuthorizedFile } from '@/utils/downloadAuthorizedFile';
import { applyApiFieldErrors } from '@/utils/formErrors';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().max(2000),
  category: z.enum(LEARNING_MATERIAL_CATEGORIES),
  classOfferingId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  publish: z.boolean(),
});

type FormValues = z.input<typeof schema>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TeacherLearningMaterialsPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<LearningMaterial | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LearningMaterial | null>(null);
  const [q, setQ] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useTeacherClasses();
  const listQuery = useQuery({
    queryKey: queryKeys.teacher.learningMaterials.list({ q: q.trim() || undefined, limit: 50 }),
    queryFn: ({ signal }) =>
      listTeacherLearningMaterials(
        { page: 1, limit: 50, ...(q.trim() ? { q: q.trim() } : {}) },
        { signal },
      ),
    select: (response) => response.data,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'NOTES',
      classOfferingId: '',
      subjectId: '',
      publish: false,
    },
  });

  const selectedClassId = useWatch({ control: form.control, name: 'classOfferingId' });
  const subjects = useMemo(() => {
    const klass = (classes.data?.items ?? []).find((item) => String(item.id) === selectedClassId);
    return klass?.subjects ?? [];
  }, [classes.data, selectedClassId]);

  const selectedClass = (classes.data?.items ?? []).find(
    (item) => String(item.id) === selectedClassId,
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.teacher.learningMaterials.all });
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!file) throw new Error('FILE_REQUIRED');
      if (!selectedClass) throw new Error('CLASS_REQUIRED');
      return createTeacherLearningMaterial(
        {
          title: values.title.trim(),
          description: values.description.trim() || null,
          category: values.category,
          academicYearId: selectedClass.academicYear.id,
          classOfferingId: Number(values.classOfferingId),
          subjectId: Number(values.subjectId),
          publish: values.publish,
        },
        file,
      );
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      form.reset({
        title: '',
        description: '',
        category: 'NOTES',
        classOfferingId: '',
        subjectId: '',
        publish: false,
      });
      setFile(null);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      if (error instanceof Error && error.message === 'FILE_REQUIRED') {
        setActionError('Choose a file to upload.');
        return;
      }
      if (!applyApiFieldErrors(error, form.setError)) {
        setActionError(getErrorMessage(error, 'Unable to upload material.'));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateTeacherLearningMaterial(editing!.id, {
        title: values.title.trim(),
        description: values.description.trim() || null,
        category: values.category,
      }),
    onSuccess: async (response) => {
      setEditing(null);
      setActionSuccess(response.message);
      form.reset({
        title: '',
        description: '',
        category: 'NOTES',
        classOfferingId: '',
        subjectId: '',
        publish: false,
      });
      await invalidate();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to update.')),
  });

  const publishMutation = useMutation({
    mutationFn: (item: LearningMaterial) =>
      item.isPublished
        ? unpublishTeacherLearningMaterial(item.id)
        : publishTeacherLearningMaterial(item.id),
    onSuccess: async (response) => {
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to change publication.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeacherLearningMaterial(pendingDelete!.id),
    onSuccess: async (response) => {
      setPendingDelete(null);
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete.'));
    },
  });

  const items = listQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="Learning materials"
        description="Upload resources for your assigned classes and subjects. Students only see published items."
      />

      {actionSuccess ? <FormAlert tone="success">{actionSuccess}</FormAlert> : null}
      {actionError ? <FormAlert tone="error">{actionError}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={form.handleSubmit((values) => {
            if (editing) updateMutation.mutate(values);
            else createMutation.mutate(values);
          })}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? 'Edit material' : 'Upload material'}
          </h2>
          <FormField
            id="lm-title"
            label="Title"
            required
            error={form.formState.errors.title?.message}
          >
            <Input id="lm-title" {...form.register('title')} />
          </FormField>
          <FormField id="lm-desc" label="Description">
            <Input id="lm-desc" {...form.register('description')} />
          </FormField>
          <FormField id="lm-cat" label="Category">
            <Select id="lm-cat" {...form.register('category')}>
              {LEARNING_MATERIAL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {LEARNING_MATERIAL_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </FormField>
          {!editing ? (
            <>
              <FormField
                id="lm-class"
                label="Class"
                required
                error={form.formState.errors.classOfferingId?.message}
              >
                <Select
                  id="lm-class"
                  {...form.register('classOfferingId', {
                    onChange: () => form.setValue('subjectId', ''),
                  })}
                >
                  <option value="">Select class</option>
                  {(classes.data?.items ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="lm-subject"
                label="Subject"
                required
                error={form.formState.errors.subjectId?.message}
              >
                <Select id="lm-subject" {...form.register('subjectId')}>
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="lm-file"
                label="File"
                required
                hint="PDF, DOC/DOCX, PPT/PPTX, JPEG, PNG"
              >
                <Input
                  id="lm-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </FormField>
              <label className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" {...form.register('publish')} />
                Publish immediately
              </label>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Save changes' : 'Upload'}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setEditing(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4 lg:col-span-3">
          <FormField id="lm-search" label="Search my materials">
            <Input id="lm-search" value={q} onChange={(e) => setQ(e.target.value)} />
          </FormField>
          {listQuery.isLoading ? <LoadingState message="Loading…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load materials.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState title="No materials yet" description="Upload a resource for your class." />
          ) : null}
          <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-title-md text-primary">{item.title}</h3>
                  <StatusBadge status={item.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {item.subject?.name} · {item.classOffering?.name} · {item.originalName} ·{' '}
                  {formatBytes(item.fileSize)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setEditing(item);
                      form.reset({
                        title: item.title,
                        description: item.description ?? '',
                        category: item.category,
                        classOfferingId: String(item.classOfferingId),
                        subjectId: String(item.subjectId),
                        publish: item.isPublished,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() =>
                      void downloadAuthorizedFile(
                        endpoints.teacher.learningMaterials.download(item.id),
                        getTeacherAccessToken(),
                      ).catch((error: unknown) =>
                        setActionError(getErrorMessage(error, 'Download failed.')),
                      )
                    }
                  >
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => publishMutation.mutate(item)}
                  >
                    {item.isPublished ? 'Unpublish' : 'Publish'}
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
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete material?"
        description={pendingDelete ? pendingDelete.title : ''}
        confirmLabel="Delete"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
