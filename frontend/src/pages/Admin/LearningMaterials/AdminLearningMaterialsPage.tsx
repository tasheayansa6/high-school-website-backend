import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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
import {
  useAcademicYearOptions,
  useClassOfferingOptions,
  useSubjectOptions,
  useTeacherOptions,
} from '@/hooks/useSmsReferenceData';
import { getAccessToken } from '@/services/api/authToken';
import { endpoints } from '@/services/api/endpoints';
import { queryKeys } from '@/services/api/queryKeys';
import {
  archiveAdminLearningMaterial,
  deleteAdminLearningMaterial,
  getAdminLearningMaterialStats,
  listAdminLearningMaterials,
  publishAdminLearningMaterial,
  unpublishAdminLearningMaterial,
} from '@/services/sms/learningMaterialService';
import {
  LEARNING_MATERIAL_CATEGORIES,
  LEARNING_MATERIAL_CATEGORY_LABELS,
  type LearningMaterial,
  type LearningMaterialCategory,
} from '@/types/learningMaterial.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { downloadAuthorizedFile } from '@/utils/downloadAuthorizedFile';
import { personName, teacherLabel } from '@/utils/smsFormat';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminLearningMaterialsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | LearningMaterialCategory>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pending, setPending] = useState<{
    type: 'archive' | 'delete';
    item: LearningMaterial;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const years = useAcademicYearOptions();
  const classes = useClassOfferingOptions(yearFilter ? Number(yearFilter) : undefined);
  const subjects = useSubjectOptions();
  const teachers = useTeacherOptions();

  const listQueryParams = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(yearFilter ? { academicYearId: Number(yearFilter) } : {}),
      ...(classFilter ? { classOfferingId: Number(classFilter) } : {}),
      ...(subjectFilter ? { subjectId: Number(subjectFilter) } : {}),
      ...(teacherFilter ? { teacherId: Number(teacherFilter) } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(includeArchived ? { includeArchived: true } : {}),
    }),
    [q, yearFilter, classFilter, subjectFilter, teacherFilter, categoryFilter, includeArchived],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.sms.learningMaterials.list(listQueryParams),
    queryFn: ({ signal }) => listAdminLearningMaterials(listQueryParams, { signal }),
    select: (response) => response.data,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.sms.learningMaterials.stats({
      academicYearId: yearFilter ? Number(yearFilter) : undefined,
    }),
    queryFn: ({ signal }) =>
      getAdminLearningMaterialStats(yearFilter ? { academicYearId: Number(yearFilter) } : {}, {
        signal,
      }),
    select: (response) => response.data,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.learningMaterials.all });
  };

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishAdminLearningMaterial(id),
    onSuccess: async (response) => {
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to publish.')),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => unpublishAdminLearningMaterial(id),
    onSuccess: async (response) => {
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to unpublish.')),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error('Nothing pending');
      if (pending.type === 'archive') return archiveAdminLearningMaterial(pending.item.id);
      return deleteAdminLearningMaterial(pending.item.id);
    },
    onSuccess: async (response) => {
      setPending(null);
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => {
      setPending(null);
      setActionError(getErrorMessage(error, 'Unable to complete action.'));
    },
  });

  const items = listQuery.data?.items ?? [];
  const stats = statsQuery.data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Learning materials"
        description="Oversee teacher-uploaded resources, publication status, and archive inappropriate content."
      />

      {actionSuccess ? <FormAlert tone="success">{actionSuccess}</FormAlert> : null}
      {actionError ? <FormAlert tone="error">{actionError}</FormAlert> : null}

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Total', stats.total],
            ['Published', stats.published],
            ['Draft', stats.draft],
            ['Archived', stats.archived],
            ['Storage', formatBytes(stats.totalFileBytes)],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="border border-outline-variant/40 bg-surface-container-lowest px-4 py-3"
            >
              <p className="text-caption text-on-surface-variant">{label}</p>
              <p className="font-display text-headline-sm text-primary">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <FormField id="lm-q" label="Search">
          <Input id="lm-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title…" />
        </FormField>
        <FormField id="lm-year" label="Year">
          <Select
            id="lm-year"
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setClassFilter('');
            }}
          >
            <option value="">All years</option>
            {(years.data ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="lm-class" label="Class">
          <Select
            id="lm-class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {(classes.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="lm-subject" label="Subject">
          <Select
            id="lm-subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">All subjects</option>
            {(subjects.data ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="lm-teacher" label="Teacher">
          <Select
            id="lm-teacher"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="">All teachers</option>
            {(teachers.data ?? []).map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacherLabel(teacher)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="lm-category" label="Category">
          <Select
            id="lm-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as '' | LearningMaterialCategory)}
          >
            <option value="">All</option>
            {LEARNING_MATERIAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {LEARNING_MATERIAL_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Include archived
      </label>

      {listQuery.isLoading ? <LoadingState message="Loading materials…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load materials.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState title="No materials" description="Teachers have not uploaded resources yet." />
      ) : null}

      <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-title-md text-primary">{item.title}</h3>
                <StatusBadge
                  status={item.archivedAt ? 'ARCHIVED' : item.isPublished ? 'PUBLISHED' : 'DRAFT'}
                />
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {item.subject?.name} · {item.classOffering?.name}
                {item.teacher ? ` · ${personName(item.teacher)}` : ''}
              </p>
              <p className="text-caption text-on-surface-variant">
                {LEARNING_MATERIAL_CATEGORY_LABELS[item.category]} · {item.originalName} ·{' '}
                {formatBytes(item.fileSize)} · {item.mimeType}
              </p>
              {item.description ? (
                <p className="text-body-sm text-on-surface">{item.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() =>
                  void downloadAuthorizedFile(
                    endpoints.admin.sms.learningMaterials.download(item.id),
                    getAccessToken(),
                  ).catch((error: unknown) =>
                    setActionError(getErrorMessage(error, 'Download failed.')),
                  )
                }
              >
                Download
              </Button>
              {item.isPublished ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => unpublishMutation.mutate(item.id)}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  disabled={Boolean(item.archivedAt)}
                  onClick={() => publishMutation.mutate(item.id)}
                >
                  Publish
                </Button>
              )}
              {!item.archivedAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setPending({ type: 'archive', item })}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setPending({ type: 'delete', item })}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.type === 'archive' ? 'Archive material?' : 'Delete material?'}
        description={
          pending ? `${pending.item.title} will be hidden from teachers and students.` : ''
        }
        confirmLabel={pending?.type === 'archive' ? 'Archive' : 'Delete'}
        busy={confirmMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => confirmMutation.mutate()}
      />
    </div>
  );
}
