import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { AssignmentForm } from '@/components/ops/AssignmentForm';
import { SubmissionsPanel } from '@/components/ops/SubmissionsPanel';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTeacherAssignments, useTeacherSubmissions } from '@/hooks/useTeacherOps';
import { useTeacherClasses } from '@/hooks/useTeacherPortal';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  gradeTeacherSubmission,
  updateTeacherAssignment,
} from '@/services/teacher/teacherOpsService';
import type {
  Assignment,
  CreateAssignmentBody,
  GradeSubmissionBody,
  UpdateAssignmentBody,
} from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateTime } from '@/utils/opsFormat';

const PAGE_SIZE = 20;

type Panel =
  { type: 'form'; editing: Assignment | null } | { type: 'submissions'; assignment: Assignment };

export default function TeacherAssignmentsPage() {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>({ type: 'form', editing: null });
  const [pendingDelete, setPendingDelete] = useState<Assignment | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useTeacherClasses();
  const listQuery = useTeacherAssignments({ page, limit: PAGE_SIZE });
  const items = listQuery.data?.items ?? [];

  const submissionsId = panel.type === 'submissions' ? panel.assignment.id : null;
  const submissions = useTeacherSubmissions(submissionsId, { page: 1, limit: 100 });

  const classOptions = useMemo(
    () => (classes.data?.items ?? []).map((item) => ({ id: item.id, label: item.name })),
    [classes.data],
  );
  const subjectsByClass = useMemo(() => {
    const map = new Map<number, { id: number; label: string }[]>();
    for (const item of classes.data?.items ?? []) {
      map.set(
        item.id,
        item.subjects.map((subject) => ({ id: subject.id, label: subject.name })),
      );
    }
    return map;
  }, [classes.data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teacher.assignments.all });

  const createMutation = useMutation({
    mutationFn: (body: CreateAssignmentBody) => createTeacherAssignment(body),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await invalidate();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAssignmentBody }) =>
      updateTeacherAssignment(id, body),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeacherAssignment(id),
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
      gradeTeacherSubmission(submissionsId!, submissionId, body),
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
        eyebrow="Teacher portal"
        title="Assignments"
        description="Create assignments for your classes and grade student submissions."
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

      {classes.isError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(classes.error, 'Unable to load your classes.')}
          onRetry={() => void classes.refetch()}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {panel.type === 'form' ? (
            <AssignmentForm
              key={panel.editing?.id ?? 'new'}
              editing={panel.editing}
              classes={classOptions}
              subjectsForClass={(classId) => subjectsByClass.get(classId) ?? []}
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
          {listQuery.isLoading ? <LoadingState message="Loading assignments…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load assignments.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState title="No assignments yet" description="Create your first assignment." />
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
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      Due {formatDateTime(item.dueAt)} · Max score {item.maxScore}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
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
