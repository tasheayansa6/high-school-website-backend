import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
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
} from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  approveGradebookExamination,
  createAssessmentCategory,
  getAdminClassSubjectGradebook,
  listAssessmentCategories,
  listGradebookOverview,
  listGradingScales,
  listPendingSubmissions,
  rejectGradebookExamination,
  validateWeights,
} from '@/services/sms/gradebookService';
import { getErrorMessage } from '@/utils/apiMessage';

type Tab = 'overview' | 'pending' | 'config';

export default function AdminGradebookPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [yearFilter, setYearFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [selected, setSelected] = useState<{
    classOfferingId: number;
    subjectId: number;
    academicYearId: number;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [weightInput, setWeightInput] = useState('40,60');

  const years = useAcademicYearOptions();
  const classes = useClassOfferingOptions(yearFilter ? Number(yearFilter) : undefined);
  const subjects = useSubjectOptions();

  const overviewParams = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(yearFilter ? { academicYearId: Number(yearFilter) } : {}),
      ...(classFilter ? { classOfferingId: Number(classFilter) } : {}),
      ...(subjectFilter ? { subjectId: Number(subjectFilter) } : {}),
    }),
    [yearFilter, classFilter, subjectFilter],
  );

  const overview = useQuery({
    queryKey: queryKeys.sms.gradebook.overview(overviewParams),
    queryFn: ({ signal }) => listGradebookOverview(overviewParams, { signal }),
    select: (response) => response.data,
    enabled: tab === 'overview',
  });

  const pending = useQuery({
    queryKey: queryKeys.sms.gradebook.pending({}),
    queryFn: ({ signal }) => listPendingSubmissions({}, { signal }),
    select: (response) => response.data,
    enabled: tab === 'pending',
  });

  const scales = useQuery({
    queryKey: queryKeys.sms.gradebook.scales,
    queryFn: ({ signal }) => listGradingScales({ signal }),
    select: (response) => response.data,
    enabled: tab === 'config',
  });

  const categories = useQuery({
    queryKey: queryKeys.sms.gradebook.categories({}),
    queryFn: ({ signal }) => listAssessmentCategories({}, { signal }),
    select: (response) => response.data,
    enabled: tab === 'config',
  });

  const detail = useQuery({
    queryKey: queryKeys.sms.gradebook.classSubject(selected ?? {}),
    queryFn: ({ signal }) => getAdminClassSubjectGradebook(selected!, { signal }),
    select: (response) => response.data,
    enabled: Boolean(selected),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveGradebookExamination(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.gradebook.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to approve results.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectGradebookExamination(id, { reason: 'Needs correction' }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.gradebook.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to reject results.'));
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createAssessmentCategory({
        code: newCategoryCode.trim().toUpperCase(),
        name: newCategoryName.trim(),
        defaultWeight: 1,
      }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setNewCategoryCode('');
      setNewCategoryName('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.gradebook.categories({}) });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to create category.'));
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => {
      const weights = weightInput
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n));
      return validateWeights({ weights, weightMode: 'PERCENT' });
    },
    onSuccess: (response) => {
      setActionError(null);
      setActionSuccess(
        response.data.valid
          ? `Weights valid (sum ${response.data.sum}).`
          : (response.data.message ?? 'Weights invalid.'),
      );
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to validate weights.'));
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Gradebook"
        description="Configure grading rules, review teacher submissions, and inspect class performance. Marks remain on existing examinations."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ['overview', 'Overview'],
            ['pending', 'Pending review'],
            ['config', 'Configuration'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? 'primary' : 'secondary'}
            onClick={() => {
              setTab(id);
              setActionError(null);
              setActionSuccess(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

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

      {tab === 'overview' ? (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <FormField id="gb-year" label="Academic year">
              <Select
                id="gb-year"
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setClassFilter('');
                  setSelected(null);
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
            <FormField id="gb-class" label="Class">
              <Select
                id="gb-class"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSelected(null);
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
            <FormField id="gb-subject" label="Subject">
              <Select
                id="gb-subject"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setSelected(null);
                }}
              >
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {overview.isLoading ? <LoadingState message="Loading gradebooks…" /> : null}
          {overview.isError ? (
            <ErrorState
              message={getErrorMessage(overview.error, 'Unable to load overview.')}
              onRetry={() => void overview.refetch()}
            />
          ) : null}
          {overview.isSuccess && overview.data.items.length === 0 ? (
            <EmptyState
              title="No gradebooks yet"
              description="Create examinations to populate gradebooks."
            />
          ) : null}

          {overview.isSuccess && overview.data.items.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-container-low text-on-surface">
                  <tr>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Assessments</th>
                    <th className="px-4 py-3 font-medium">Draft</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Published</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.data.items.map((item) => (
                    <tr
                      key={`${item.classOfferingId}-${item.subjectId}-${item.academicTermId}`}
                      className="border-t"
                    >
                      <td className="px-4 py-3">
                        {item.classOffering?.name ?? item.classOfferingId}
                      </td>
                      <td className="px-4 py-3">{item.subject?.name ?? item.subjectId}</td>
                      <td className="px-4 py-3">{item.assessmentCount}</td>
                      <td className="px-4 py-3">{item.draftCount}</td>
                      <td className="px-4 py-3">{item.submittedCount}</td>
                      <td className="px-4 py-3">{item.publishedCount}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setSelected({
                              classOfferingId: item.classOfferingId,
                              subjectId: item.subjectId,
                              academicYearId: item.academicYearId,
                            })
                          }
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {selected ? (
            <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-primary">Class gradebook</h2>
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              {detail.isLoading ? <LoadingState message="Loading class gradebook…" /> : null}
              {detail.isError ? (
                <ErrorState message={getErrorMessage(detail.error, 'Unable to load gradebook.')} />
              ) : null}
              {detail.data ? (
                <>
                  <p className="mb-3 text-sm text-on-surface-variant">
                    {detail.data.classOffering.name} · {detail.data.subject?.name} · average{' '}
                    {detail.data.summary.classAveragePercent ?? '—'}% · missing marks{' '}
                    {detail.data.summary.missingMarksCount}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="px-3 py-2">Student</th>
                          {detail.data.assessments.map((assessment) => (
                            <th key={assessment.id} className="px-3 py-2">
                              {assessment.name}
                            </th>
                          ))}
                          <th className="px-3 py-2">Total %</th>
                          <th className="px-3 py-2">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.students.map((row) => (
                          <tr key={row.studentId} className="border-t">
                            <td className="px-3 py-2">
                              {row.student
                                ? `${row.student.firstName} ${row.student.lastName}`
                                : row.studentId}
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
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'pending' ? (
        <>
          {pending.isLoading ? <LoadingState message="Loading pending submissions…" /> : null}
          {pending.isError ? (
            <ErrorState
              message={getErrorMessage(pending.error, 'Unable to load pending submissions.')}
              onRetry={() => void pending.refetch()}
            />
          ) : null}
          {pending.isSuccess && pending.data.items.length === 0 ? (
            <EmptyState
              title="No pending submissions"
              description="Submitted teacher marks will appear here for approval."
            />
          ) : null}
          {pending.isSuccess && pending.data.items.length > 0 ? (
            <div className="space-y-3">
              {pending.data.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-on-surface">{item.name}</p>
                    <p className="text-sm text-on-surface-variant">
                      {item.classOffering?.name} · {item.subject?.name} · {item.resultCount} marks
                    </p>
                    <StatusBadge status="SUBMITTED" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve & publish
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => rejectMutation.mutate(item.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'config' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-outline-variant/40 bg-surface p-4">
            <h2 className="mb-3 text-lg font-semibold text-primary">Grading scales</h2>
            {scales.isLoading ? <LoadingState message="Loading scales…" /> : null}
            {scales.data?.items.map((scale) => (
              <div key={scale.id} className="mb-3 rounded-lg border border-outline-variant/40 p-3">
                <p className="font-medium">
                  {scale.name} {scale.isDefault ? '(default)' : ''}
                </p>
                <p className="text-sm text-on-surface-variant">
                  Mode {scale.weightMode} · missing as zero:{' '}
                  {scale.treatMissingAsZero ? 'yes' : 'no'}
                </p>
                <ul className="mt-2 text-sm">
                  {scale.boundaries.map((boundary) => (
                    <li key={`${scale.id}-${boundary.letter}`}>
                      {boundary.letter}: {boundary.minPercent}–{boundary.maxPercent}
                      {boundary.remark ? ` (${boundary.remark})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <FormField id="gb-weights" label="Validate PERCENT weights (comma-separated)">
              <Input
                id="gb-weights"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </FormField>
            <Button
              type="button"
              className="mt-2"
              variant="secondary"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
            >
              Validate weights
            </Button>
          </section>

          <section className="rounded-xl border border-outline-variant/40 bg-surface p-4">
            <h2 className="mb-3 text-lg font-semibold text-primary">Assessment categories</h2>
            {categories.isLoading ? <LoadingState message="Loading categories…" /> : null}
            <ul className="mb-4 space-y-2 text-sm">
              {(categories.data?.items ?? []).map((category) => (
                <li
                  key={category.id}
                  className="flex justify-between border-b border-outline-variant/40 py-2"
                >
                  <span>
                    {category.name}{' '}
                    <span className="text-on-surface-variant">({category.code})</span>
                  </span>
                  <span>weight {category.defaultWeight}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3">
              <FormField id="cat-code" label="Code">
                <Input
                  id="cat-code"
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value)}
                />
              </FormField>
              <FormField id="cat-name" label="Name">
                <Input
                  id="cat-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </FormField>
              <Button
                type="button"
                onClick={() => createCategoryMutation.mutate()}
                disabled={
                  createCategoryMutation.isPending ||
                  !newCategoryCode.trim() ||
                  !newCategoryName.trim()
                }
              >
                Add category
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
