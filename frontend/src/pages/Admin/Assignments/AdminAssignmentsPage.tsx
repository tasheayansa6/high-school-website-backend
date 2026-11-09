import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { AssignmentForm } from '@/components/ops/AssignmentForm';
import { SubmissionsPanel } from '@/components/ops/SubmissionsPanel';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  useClassOfferingOptions,
  useSubjectOptions,
  useTeacherOptions,
} from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  listAssignments,
  listSubmissions,
  updateAssignment,
} from '@/services/sms/assignmentService';
import type { Assignment, CreateAssignmentBody, GradeSubmissionBody } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateTime } from '@/utils/opsFormat';
import { personName } from '@/utils/smsFormat';

const PAGE_SIZE = 20;

type Panel =
  { type: 'form'; editing: Assignment | null } | { type: 'submissions'; assignment: Assignment };

export default function AdminAssignmentsPage() {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>({ type: 'form', editing: null });
  const [pendingDelete, setPendingDelete] = useState<Assignment | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useClassOfferingOptions();
  const subjects = useSubjectOptions();
  const teachers = useTeacherOptions();

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(classFilter ? { classOfferingId: Number(classFilter) } : {}),
    ...(publishedFilter ? { isPublished: publishedFilter === 'true' } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.assignments.list({ ...query }),
    queryFn: ({ signal }) => listAssignments(query, { signal }),
    select: (response) => response.data,
  });
  const items = listQuery.data?.items ?? [];

  const submissionsId = panel.type === 'submissions' ? panel.assignment.id : null;
  const submissionsQuery = { page: 1, limit: 100 };
  const submissions = useQuery({
    queryKey: queryKeys.sms.assignments.submissions(submissionsId ?? 0, submissionsQuery),
    queryFn: ({ signal }) => listSubmissions(submissionsId!, submissionsQuery, { signal }),
    select: (response) => response.data,
    enabled: submissionsId !== null,
  });

  const classOptions = useMemo(
    () => (classes.data ?? []).map((item) => ({ id: item.id, label: item.name })),
    [classes.data],
  );
  const subjectOptions = useMemo(
    () =>
      (subjects.data ?? []).map((item) => ({ id: item.id, label: `${item.name} (${item.code})` })),
    [subjects.data],
  );
  const teacherOptions = useMemo(
    () => (teachers.data ?? []).map((item) => ({ id: item.id, label: personName(item) })),
    [teachers.data],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sms.assignments.all });

  const createMutation = useMutation({
    mutationFn: (body: CreateAssignmentBody) => createAssignment(body),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await invalidate();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateAssignment>[1] }) =>
      updateAssignment(id, body),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAssignment(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      setPanel({ type: 'form', editing: null });
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete the assignment.'));
    },
  });
  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, body }: { submissionId: number; body: GradeSubmissionBody }) =>
      gradeSubmission(submissionsId!, submissionId, body),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await invalidate();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to grade the submission.')),
  });

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Assignments"
        description="Create assignments for classes, publish them, and grade submissions."
      >
        {panel.type === 'form' && panel.editing ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setPanel({ type: 'form', editing: null })}
          >
            New assignment
          </Button>
        ) : null}
      </CmsSectionHeader>

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
          {panel.type === 'form' ? (
            <AssignmentForm
              key={panel.editing?.id ?? 'new'}
              editing={panel.editing}
              classes={classOptions}
              subjectsForClass={() => subjectOptions}
              teachers={teacherOptions}
              teachersHint={
                teachers.canListTeachers
                  ? undefined
                  : 'Listing teachers requires the teachers:manage permission.'
              }
              onCreate={(body) => createMutation.mutateAsync(body)}
              onUpdate={(id, body) => updateMutation.mutateAsync({ id, body })}
              onDone={() => setPanel({ type: 'form', editing: null })}
            />
          ) : (
            <section className="border border-outline-variant/40 bg-surface-container-low p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-headline-sm text-primary">Submissions</h2>
                  <p className="text-caption text-on-surface-variant">{panel.assignment.title}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setPanel({ type: 'form', editing: null })}
                >
                  Close
                </Button>
              </div>
              {submissions.isLoading ? <LoadingState message="Loading submissions…" /> : null}
              {submissions.isError ? (
                <ErrorState
                  message={getErrorMessage(submissions.error, 'Unable to load submissions.')}
                  onRetry={() => void submissions.refetch()}
                />
              ) : null}
              {submissions.isSuccess ? (
                <SubmissionsPanel
                  submissions={submissions.data.items}
                  maxScore={panel.assignment.maxScore}
                  gradingId={
                    gradeMutation.isPending ? (gradeMutation.variables?.submissionId ?? null) : null
                  }
                  error={null}
                  onGrade={(submissionId, body) => gradeMutation.mutate({ submissionId, body })}
                />
              ) : null}
            </section>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField id="asg-filter-class" label="Class">
              <Select
                id="asg-filter-class"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All classes</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="asg-filter-published" label="State">
              <Select
                id="asg-filter-published"
                value={publishedFilter}
                onChange={(e) => {
                  setPublishedFilter(e.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Published</option>
                <option value="false">Drafts</option>
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading assignments…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load assignments.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No assignments found"
              description="Create an assignment or adjust the filters."
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
                      {item.title}
                      <StatusBadge status={item.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.classOffering?.name ?? `Class #${item.classOfferingId}`} ·{' '}
                      {item.subject?.name ?? `Subject #${item.subjectId}`}
                      {item.teacher ? ` · ${personName(item.teacher)}` : ''}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      Due {formatDateTime(item.dueAt)} · Max score {item.maxScore}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPanel({ type: 'submissions', assignment: item })}
                    >
                      Submissions
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setActionSuccess(null);
                        setPanel({ type: 'form', editing: item });
                      }}
                    >
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
        open={pendingDelete !== null}
        title="Delete this assignment?"
        description={pendingDelete ? `"${pendingDelete.title}" will be removed.` : ''}
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
