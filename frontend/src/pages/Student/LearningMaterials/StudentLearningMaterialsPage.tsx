import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import { getStudentAccessToken } from '@/services/api/studentAuthToken';
import { listStudentLearningMaterials } from '@/services/student/studentLearningMaterialService';
import {
  LEARNING_MATERIAL_CATEGORIES,
  LEARNING_MATERIAL_CATEGORY_LABELS,
  type LearningMaterialCategory,
} from '@/types/learningMaterial.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { downloadAuthorizedFile } from '@/utils/downloadAuthorizedFile';
import { personName } from '@/utils/smsFormat';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentLearningMaterialsPage() {
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | LearningMaterialCategory>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(subjectFilter ? { subjectId: Number(subjectFilter) } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
    }),
    [q, subjectFilter, categoryFilter],
  );

  const query = useQuery({
    queryKey: queryKeys.student.learningMaterials(queryParams),
    queryFn: ({ signal }) => listStudentLearningMaterials(queryParams, { signal }),
    select: (response) => response.data,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const subjects = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of items) {
      if (item.subject) map.set(item.subject.id, item.subject.name);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Learning materials"
        description="Published resources for your enrolled class. Download only what your teachers share."
      />

      {actionError ? <FormAlert tone="error">{actionError}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FormField id="stu-lm-q" label="Search">
          <Input id="stu-lm-q" value={q} onChange={(e) => setQ(e.target.value)} />
        </FormField>
        <FormField id="stu-lm-subject" label="Subject">
          <Select
            id="stu-lm-subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="stu-lm-category" label="Category">
          <Select
            id="stu-lm-category"
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

      {query.isLoading ? <LoadingState message="Loading materials…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load materials.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No materials yet"
          description="Published class resources will appear here."
        />
      ) : null}

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="space-y-3 border border-outline-variant/40 bg-surface-container-lowest p-5"
          >
            <div>
              <h3 className="font-display text-title-md text-primary">{item.title}</h3>
              <p className="text-body-sm text-on-surface-variant">
                {item.subject?.name}
                {item.teacher ? ` · ${personName(item.teacher)}` : ''}
                {item.classOffering ? ` · ${item.classOffering.name}` : ''}
              </p>
            </div>
            {item.description ? (
              <p className="text-body-sm text-on-surface">{item.description}</p>
            ) : null}
            <p className="text-caption text-on-surface-variant">
              {LEARNING_MATERIAL_CATEGORY_LABELS[item.category]} · {item.originalName} ·{' '}
              {formatBytes(item.fileSize)}
              {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString()}` : ''}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() =>
                void downloadAuthorizedFile(
                  `/student/learning-materials/${item.id}/download`,
                  getStudentAccessToken(),
                ).catch((error: unknown) =>
                  setActionError(getErrorMessage(error, 'Download failed.')),
                )
              }
            >
              Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
