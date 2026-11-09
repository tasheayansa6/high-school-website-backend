import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentAssignments } from '@/hooks/useStudentOps';
import { queryKeys } from '@/services/api/queryKeys';
import { submitStudentAssignment } from '@/services/student/studentOpsService';
import type { Assignment } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateTime } from '@/utils/opsFormat';

const PAGE_SIZE = 20;

function SubmitDialog({
  assignment,
  onClose,
  onSubmitted,
}: {
  assignment: Assignment;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(assignment.submission?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: string) => submitStudentAssignment(assignment.id, { content: body }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.student.all });
      onSubmitted(response.message);
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Unable to submit your work.')),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Write your answer before submitting.');
      return;
    }
    setError(null);
    mutation.mutate(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-dialog-title"
        onSubmit={handleSubmit}
        className="w-full max-w-xl space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-lg"
      >
        <div>
          <h2 id="submit-dialog-title" className="font-display text-headline-sm text-primary">
            Submit: {assignment.title}
          </h2>
          <p className="text-caption text-on-surface-variant">
            Due {formatDateTime(assignment.dueAt)} · Max score {assignment.maxScore}
          </p>
        </div>
        <FormField id="submit-content" label="Your answer" required>
          <Textarea
            id="submit-content"
            rows={8}
            value={content}
            disabled={mutation.isPending}
            maxLength={20000}
            onChange={(e) => setContent(e.target.value)}
          />
        </FormField>
        {error ? <FormAlert tone="error">{error}</FormAlert> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
          >
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Assignment | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const query = useStudentAssignments({ page, limit: PAGE_SIZE });
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Assignments"
        description="Published assignments for your classes."
      />

      {success ? (
        <FormAlert tone="success" className="mb-4">
          {success}
        </FormAlert>
      ) : null}
      {query.isLoading ? <LoadingState message="Loading assignments…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load assignments.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No assignments"
          description="Nothing has been assigned to your classes."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
                  {item.title}
                  {item.submission ? <StatusBadge status={item.submission.status} /> : null}
                </p>
                <p className="text-caption text-on-surface-variant">
                  {item.classOffering?.name ?? `Class #${item.classOfferingId}`} ·{' '}
                  {item.subject?.name ?? `Subject #${item.subjectId}`}
                </p>
                <p className="text-caption text-on-surface-variant">
                  Due {formatDateTime(item.dueAt)} · Max score {item.maxScore}
                </p>
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-body-sm text-on-surface-variant">
                    {item.description}
                  </p>
                ) : null}
                {item.submission?.score !== null && item.submission?.score !== undefined ? (
                  <p className="mt-2 text-body-md text-primary">
                    Score: {item.submission.score} / {item.maxScore}
                  </p>
                ) : null}
                {item.submission?.feedback ? (
                  <p className="text-body-sm text-on-surface-variant">
                    Feedback: {item.submission.feedback}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant={item.submission ? 'ghost' : 'primary'}
                size="md"
                onClick={() => {
                  setSuccess(null);
                  setTarget(item);
                }}
              >
                {item.submission ? 'Resubmit' : 'Submit'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <PaginationControls pagination={query.data?.pagination} onPageChange={setPage} />

      {target ? (
        <SubmitDialog
          key={target.id}
          assignment={target}
          onClose={() => setTarget(null)}
          onSubmitted={setSuccess}
        />
      ) : null}
    </div>
  );
}
