import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { ResultsEditor } from '@/components/ops/ResultsEditor';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useClassOfferingOptions, useSubjectOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import { listEnrollments } from '@/services/sms/enrollmentService';
import {
  createExamination,
  deleteExamination,
  listExaminations,
  listExamResults,
  publishExamination,
  saveExamResults,
  updateExamination,
} from '@/services/sms/examinationService';
import type { Examination, UpsertExamResultInput } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { personLabel } from '@/utils/opsFormat';
import { formatDateOnly, toDateInputValue } from '@/utils/smsFormat';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  examType: z.string().trim().max(50),
  classOfferingId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  examDate: z.string(),
  maxScore: z
    .string()
    .refine((value) => value.trim() === '' || Number(value) > 0, 'Max score must be positive'),
});

type FormValues = z.input<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  examType: '',
  classOfferingId: '',
  subjectId: '',
  examDate: '',
  maxScore: '100',
};

const PAGE_SIZE = 20;

function ResultsPanel({ exam, onClose }: { exam: Examination; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = useQuery({
    queryKey: queryKeys.sms.examinations.results(exam.id),
    queryFn: ({ signal }) => listExamResults(exam.id, { signal }),
    select: (response) => response.data,
  });

  const enrollmentQuery = {
    page: 1,
    limit: 100,
    classOfferingId: exam.classOfferingId,
    status: 'ACTIVE' as const,
  };
  const enrollments = useQuery({
    queryKey: queryKeys.sms.enrollments.list({ ...enrollmentQuery }),
    queryFn: ({ signal }) => listEnrollments(enrollmentQuery, { signal }),
    select: (response) => response.data,
  });

  const students = useMemo(
    () =>
      (enrollments.data?.items ?? []).flatMap((enrollment) =>
        enrollment.student
          ? [{ id: enrollment.studentId, label: personLabel(enrollment.student) }]
          : [],
      ),
    [enrollments.data],
  );

  const saveMutation = useMutation({
    mutationFn: (rows: UpsertExamResultInput[]) => saveExamResults(exam.id, { results: rows }),
    onSuccess: async (response) => {
      setError(null);
      setMessage(response.message);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sms.examinations.results(exam.id),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.reports.all });
    },
    onError: (err) => {
      setMessage(null);
      setError(getErrorMessage(err, 'Unable to save results.'));
    },
  });

  const loading = results.isLoading || enrollments.isLoading;
  const loadError = results.error ?? enrollments.error;

  return (
    <section className="border border-outline-variant/40 bg-surface-container-low p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Enter results</h2>
          <p className="text-caption text-on-surface-variant">
            {exam.name} · {exam.classOffering?.name ?? `Class #${exam.classOfferingId}`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Close
        </Button>
      </div>
      {message ? (
        <FormAlert tone="success" className="mb-4">
          {message}
        </FormAlert>
      ) : null}
      {error ? (
        <FormAlert tone="error" className="mb-4">
          {error}
        </FormAlert>
      ) : null}
      {loading ? <LoadingState message="Loading students…" /> : null}
      {loadError ? (
        <ErrorState
          message={getErrorMessage(loadError, 'Unable to load results.')}
          onRetry={() => {
            void results.refetch();
            void enrollments.refetch();
          }}
        />
      ) : null}
      {results.isSuccess && enrollments.isSuccess ? (
        students.length === 0 ? (
          <EmptyState
            title="No active students"
            description="This class has no enrolled students."
          />
        ) : (
          <ResultsEditor
            key={`${exam.id}-${results.dataUpdatedAt}-${enrollments.dataUpdatedAt}`}
            students={students}
            results={results.data.items}
            maxScore={exam.maxScore}
            saving={saveMutation.isPending}
            onSave={(rows) => saveMutation.mutate(rows)}
          />
        )
      ) : null}
    </section>
  );
}

export default function AdminExaminationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Examination | null>(null);
  const [resultsFor, setResultsFor] = useState<Examination | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Examination | null>(null);
  const [pendingPublish, setPendingPublish] = useState<Examination | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useClassOfferingOptions();
  const subjects = useSubjectOptions();

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(classFilter ? { classOfferingId: Number(classFilter) } : {}),
    ...(publishedFilter ? { isPublished: publishedFilter === 'true' } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.examinations.list({ ...query }),
    queryFn: ({ signal }) => listExaminations(query, { signal }),
    select: (response) => response.data,
  });
  const items = listQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sms.examinations.all });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = schema.parse(values);
      const maxScore = parsed.maxScore.trim() ? Number(parsed.maxScore) : undefined;
      const examType = parsed.examType.trim();
      if (editing) {
        return updateExamination(editing.id, {
          name: parsed.name,
          ...(examType ? { examType } : {}),
          examDate: parsed.examDate || null,
          ...(maxScore !== undefined ? { maxScore } : {}),
        });
      }
      const offering = (classes.data ?? []).find(
        (item) => item.id === Number(parsed.classOfferingId),
      );
      if (!offering) {
        throw new Error('Select a valid class.');
      }
      return createExamination({
        name: parsed.name,
        ...(examType ? { examType } : {}),
        classOfferingId: offering.id,
        subjectId: Number(parsed.subjectId),
        academicYearId: offering.academicYearId,
        ...(parsed.examDate ? { examDate: parsed.examDate } : {}),
        ...(maxScore !== undefined ? { maxScore } : {}),
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
        setActionError(getErrorMessage(error, 'Unable to save the examination.'));
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => publishExamination(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingPublish(null);
      await invalidate();
    },
    onError: (error) => {
      setPendingPublish(null);
      setActionError(getErrorMessage(error, 'Unable to publish the examination.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExamination(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      const deletedId = response.data.examination.id;
      setPendingDelete(null);
      if (editing?.id === deletedId) {
        setEditing(null);
        reset(EMPTY_VALUES);
      }
      if (resultsFor?.id === deletedId) setResultsFor(null);
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete the examination.'));
    },
  });

  function startEdit(item: Examination) {
    setEditing(item);
    setResultsFor(null);
    setActionSuccess(null);
    reset({
      name: item.name,
      examType: item.examType,
      classOfferingId: String(item.classOfferingId),
      subjectId: String(item.subjectId),
      examDate: toDateInputValue(item.examDate),
      maxScore: String(item.maxScore),
    });
  }

  function cancelEdit() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  const busy = isSubmitting || saveMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Examinations"
        description="Schedule exams, enter results, and publish them to students."
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
        <div className="lg:col-span-2">
          {resultsFor ? (
            <ResultsPanel
              key={resultsFor.id}
              exam={resultsFor}
              onClose={() => setResultsFor(null)}
            />
          ) : (
            <form
              className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
              onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
              noValidate
            >
              <h2 className="font-display text-headline-sm text-primary">
                {editing ? 'Edit examination' : 'New examination'}
              </h2>
              <FormField id="exam-name" label="Name" required error={errors.name?.message}>
                <Input
                  id="exam-name"
                  disabled={busy}
                  hasError={Boolean(errors.name)}
                  {...register('name')}
                />
              </FormField>
              <FormField
                id="exam-type"
                label="Type"
                hint="e.g. MIDTERM, FINAL, QUIZ. Optional."
                error={errors.examType?.message}
              >
                <Input id="exam-type" disabled={busy} {...register('examType')} />
              </FormField>
              <FormField
                id="exam-class"
                label="Class"
                required
                hint={editing ? 'Class cannot be changed after creation.' : undefined}
                error={errors.classOfferingId?.message}
              >
                <Select
                  id="exam-class"
                  disabled={busy || editing !== null}
                  hasError={Boolean(errors.classOfferingId)}
                  {...register('classOfferingId')}
                >
                  <option value="">Select class</option>
                  {(classes.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="exam-subject"
                label="Subject"
                required
                error={errors.subjectId?.message}
              >
                <Select
                  id="exam-subject"
                  disabled={busy || editing !== null}
                  hasError={Boolean(errors.subjectId)}
                  {...register('subjectId')}
                >
                  <option value="">Select subject</option>
                  {(subjects.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField id="exam-date" label="Exam date" error={errors.examDate?.message}>
                  <Input id="exam-date" type="date" disabled={busy} {...register('examDate')} />
                </FormField>
                <FormField id="exam-max" label="Max score" error={errors.maxScore?.message}>
                  <Input
                    id="exam-max"
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={busy}
                    hasError={Boolean(errors.maxScore)}
                    {...register('maxScore')}
                  />
                </FormField>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
                  {editing ? 'Save changes' : 'Create examination'}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={cancelEdit}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField id="exam-filter-class" label="Class">
              <Select
                id="exam-filter-class"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All classes</option>
                {(classes.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="exam-filter-published" label="State">
              <Select
                id="exam-filter-published"
                value={publishedFilter}
                onChange={(e) => {
                  setPublishedFilter(e.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Published</option>
                <option value="false">Unpublished</option>
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading examinations…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load examinations.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No examinations found"
              description="Create an examination or adjust the filters."
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
                    <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
                      {item.name}
                      <StatusBadge status={item.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.examType} ·{' '}
                      {item.classOffering?.name ?? `Class #${item.classOfferingId}`} ·{' '}
                      {item.subject?.name ?? `Subject #${item.subjectId}`}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {formatDateOnly(item.examDate)} · Max score {item.maxScore}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setEditing(null);
                        reset(EMPTY_VALUES);
                        setActionSuccess(null);
                        setResultsFor(item);
                      }}
                    >
                      Results
                    </Button>
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
        title="Publish this examination?"
        description={
          pendingPublish
            ? `Results for "${pendingPublish.name}" will become visible to students.`
            : ''
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
        title="Delete this examination?"
        description={
          pendingDelete ? `"${pendingDelete.name}" and its results will be removed.` : ''
        }
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
