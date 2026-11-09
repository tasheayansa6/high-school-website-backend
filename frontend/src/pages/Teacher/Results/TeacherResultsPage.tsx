import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { ResultsEditor } from '@/components/ops/ResultsEditor';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTeacherExaminations, useTeacherExamResults } from '@/hooks/useTeacherOps';
import { useTeacherClass } from '@/hooks/useTeacherPortal';
import { queryKeys } from '@/services/api/queryKeys';
import { saveTeacherExamResults } from '@/services/teacher/teacherOpsService';
import type { UpsertExamResultInput } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { personLabel } from '@/utils/opsFormat';
import { formatDateOnly } from '@/utils/smsFormat';

export default function TeacherResultsPage() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const exams = useTeacherExaminations({ page: 1, limit: 100 });
  const exam = (exams.data?.items ?? []).find((item) => item.id === Number(examId)) ?? null;

  const results = useTeacherExamResults(exam?.id ?? null);
  const detail = useTeacherClass(exam?.classOfferingId ?? null);

  const students = useMemo(
    () =>
      (detail.data?.students ?? []).map((student) => ({
        id: student.id,
        label: personLabel(student),
      })),
    [detail.data],
  );

  const saveMutation = useMutation({
    mutationFn: (rows: UpsertExamResultInput[]) =>
      saveTeacherExamResults(exam!.id, { results: rows }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacher.examinations.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to save results.'));
    },
  });

  const loading = results.isLoading || detail.isLoading;
  const loadError = results.error ?? detail.error;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="Exam Results"
        description="Enter scores for examinations in the classes and subjects you teach."
      />

      <div className="mb-6">
        <FormField id="t-res-exam" label="Examination">
          <Select
            id="t-res-exam"
            value={examId}
            disabled={exams.isLoading}
            onChange={(e) => {
              setExamId(e.target.value);
              setActionSuccess(null);
              setActionError(null);
            }}
          >
            <option value="">Select examination</option>
            {(exams.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.classOffering?.name ?? `Class #${item.classOfferingId}`} ·{' '}
                {item.subject?.name ?? `Subject #${item.subjectId}`}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {exams.isError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(exams.error, 'Unable to load examinations.')}
          onRetry={() => void exams.refetch()}
        />
      ) : null}
      {exams.isSuccess && exams.data.items.length === 0 ? (
        <EmptyState
          title="No examinations"
          description="No examinations exist yet for the classes and subjects you teach."
        />
      ) : null}
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

      {exam ? (
        <>
          <p className="mb-4 flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
            <StatusBadge status={exam.isPublished ? 'PUBLISHED' : 'DRAFT'} />
            {exam.examType} · {formatDateOnly(exam.examDate)} · Max score {exam.maxScore}
          </p>
          {loading ? <LoadingState message="Loading students…" /> : null}
          {loadError ? (
            <ErrorState
              message={getErrorMessage(loadError, 'Unable to load results.')}
              onRetry={() => {
                void results.refetch();
                void detail.refetch();
              }}
            />
          ) : null}
          {results.isSuccess && detail.isSuccess ? (
            students.length === 0 ? (
              <EmptyState
                title="No active students"
                description="This class has no actively enrolled students."
              />
            ) : (
              <ResultsEditor
                key={`${exam.id}-${results.dataUpdatedAt}-${detail.dataUpdatedAt}`}
                students={students}
                results={results.data.items}
                maxScore={exam.maxScore}
                saving={saveMutation.isPending}
                onSave={(rows) => saveMutation.mutate(rows)}
              />
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
