import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { ResultsEditor } from '@/components/ops/ResultsEditor';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTeacherExamResults } from '@/hooks/useTeacherOps';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createTeacherExamination,
  getTeacherClassSubjectGradebook,
  listTeacherGradebooks,
  submitTeacherExamMarks,
} from '@/services/teacher/teacherGradebookService';
import { saveTeacherExamResults } from '@/services/teacher/teacherOpsService';
import type { UpsertExamResultInput } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { personLabel } from '@/utils/opsFormat';

export default function TeacherGradebookPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState('');
  const [examId, setExamId] = useState('');
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('100');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.teacher.gradebook.list({}),
    queryFn: ({ signal }) => listTeacherGradebooks({}, { signal }),
    select: (response) => response.data,
  });

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    const [classOfferingId, subjectId] = selectedKey.split(':').map(Number);
    return (listQuery.data?.items ?? []).find(
      (item) => item.classOfferingId === classOfferingId && item.subjectId === subjectId,
    );
  }, [listQuery.data?.items, selectedKey]);

  const gradebookQuery = useQuery({
    queryKey: queryKeys.teacher.gradebook.classSubject({
      classOfferingId: selected?.classOfferingId,
      subjectId: selected?.subjectId,
      academicYearId: selected?.academicYearId,
    }),
    queryFn: ({ signal }) =>
      getTeacherClassSubjectGradebook(
        {
          classOfferingId: selected!.classOfferingId,
          subjectId: selected!.subjectId,
          academicYearId: selected!.academicYearId,
        },
        { signal },
      ),
    select: (response) => response.data,
    enabled: Boolean(selected),
  });

  const exam =
    (gradebookQuery.data?.assessments ?? []).find((item) => item.id === Number(examId)) ?? null;
  const results = useTeacherExamResults(exam?.id ?? null);
  const students = useMemo(
    () =>
      (gradebookQuery.data?.students ?? []).map((row) => ({
        id: row.studentId,
        label: row.student ? personLabel(row.student) : `Student #${row.studentId}`,
      })),
    [gradebookQuery.data?.students],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createTeacherExamination({
        name: newName.trim(),
        examType: 'QUIZ',
        classOfferingId: selected!.classOfferingId,
        subjectId: selected!.subjectId,
        academicYearId: selected!.academicYearId,
        maxScore: Number(newMax) || 100,
      }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setNewName('');
      setExamId(String(response.data.examination.id));
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacher.gradebook.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to create assessment.'));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (rows: UpsertExamResultInput[]) =>
      saveTeacherExamResults(exam!.id, { results: rows }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.teacher.examinations.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.teacher.gradebook.all }),
      ]);
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to save marks.'));
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTeacherExamMarks(exam!.id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacher.gradebook.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to submit marks.'));
    },
  });

  const locked = Boolean(exam?.isPublished) || exam?.marksStatus === 'SUBMITTED';

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Gradebooks"
        description="Enter and submit marks for the classes and subjects assigned to you."
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

      <div className="mb-6">
        <FormField id="t-gb-select" label="Assigned gradebook">
          <Select
            id="t-gb-select"
            value={selectedKey}
            disabled={listQuery.isLoading}
            onChange={(e) => {
              setSelectedKey(e.target.value);
              setExamId('');
              setActionError(null);
              setActionSuccess(null);
            }}
          >
            <option value="">Select class and subject</option>
            {(listQuery.data?.items ?? []).map((item) => (
              <option
                key={`${item.classOfferingId}:${item.subjectId}`}
                value={`${item.classOfferingId}:${item.subjectId}`}
              >
                {item.classOffering.name} · {item.subject.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load gradebooks.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && listQuery.data.items.length === 0 ? (
        <EmptyState
          title="No assigned gradebooks"
          description="Ask an administrator to assign you to a class and subject."
        />
      ) : null}

      {selected ? (
        <>
          {gradebookQuery.isLoading ? <LoadingState message="Loading gradebook…" /> : null}
          {gradebookQuery.isError ? (
            <ErrorState
              message={getErrorMessage(gradebookQuery.error, 'Unable to load gradebook.')}
            />
          ) : null}

          {gradebookQuery.data ? (
            <div className="mb-6 rounded-xl border border-outline-variant/40 bg-surface p-4">
              <p className="text-sm text-on-surface-variant">
                Class average {gradebookQuery.data.summary.classAveragePercent ?? '—'}% · missing
                marks {gradebookQuery.data.summary.missingMarksCount} · assessments{' '}
                {gradebookQuery.data.summary.assessmentCount}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Student</th>
                      {gradebookQuery.data.assessments.map((assessment) => (
                        <th key={assessment.id} className="px-3 py-2">
                          {assessment.name}
                        </th>
                      ))}
                      <th className="px-3 py-2">Total %</th>
                      <th className="px-3 py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradebookQuery.data.students.map((row) => (
                      <tr key={row.studentId} className="border-t">
                        <td className="px-3 py-2">
                          {row.student ? personLabel(row.student) : row.studentId}
                        </td>
                        {row.marks.map((mark) => (
                          <td key={mark.assessmentId} className="px-3 py-2">
                            {mark.missing ? '—' : mark.score}
                          </td>
                        ))}
                        <td className="px-3 py-2">{row.totalPercent ?? '—'}</td>
                        <td className="px-3 py-2">{row.gradeLetter ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <FormField id="t-gb-exam" label="Assessment">
              <Select
                id="t-gb-exam"
                value={examId}
                onChange={(e) => {
                  setExamId(e.target.value);
                  setActionError(null);
                  setActionSuccess(null);
                }}
              >
                <option value="">Select assessment</option>
                {(gradebookQuery.data?.assessments ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.marksStatus}
                    {item.isPublished ? ', published' : ''})
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="rounded-xl border border-outline-variant/40 bg-surface p-4">
              <p className="mb-2 text-sm font-medium text-on-surface">Create assessment</p>
              <div className="grid gap-2">
                <Input
                  placeholder="Assessment name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Max score"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newName.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>

          {exam ? (
            <div className="rounded-xl border border-outline-variant/40 bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <StatusBadge
                  status={
                    exam.isPublished
                      ? 'PUBLISHED'
                      : exam.marksStatus === 'SUBMITTED'
                        ? 'SUBMITTED'
                        : 'DRAFT'
                  }
                />
                {!locked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                  >
                    Submit for review
                  </Button>
                ) : null}
              </div>
              {locked ? (
                <FormAlert tone="info" className="mb-3">
                  This assessment is locked. An administrator must reopen it before you can edit
                  marks.
                </FormAlert>
              ) : null}
              {results.isLoading ? <LoadingState message="Loading marks…" /> : null}
              {results.isError ? (
                <ErrorState message={getErrorMessage(results.error, 'Unable to load marks.')} />
              ) : null}
              {results.isSuccess && !locked ? (
                <ResultsEditor
                  key={`${exam.id}-${results.dataUpdatedAt}`}
                  students={students}
                  results={results.data.items}
                  maxScore={exam.maxScore}
                  saving={saveMutation.isPending}
                  onSave={(rows) => saveMutation.mutate(rows)}
                />
              ) : null}
              {results.isSuccess && locked ? (
                <p className="text-sm text-on-surface-variant">
                  Marks are view-only while locked. Use the gradebook table above for scores.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
