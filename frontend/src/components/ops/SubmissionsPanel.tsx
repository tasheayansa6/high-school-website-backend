import { useState } from 'react';

import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AssignmentSubmission, GradeSubmissionBody } from '@/types/ops.types';
import { formatDateTime, parseNumberInput, personLabel } from '@/utils/opsFormat';

interface SubmissionsPanelProps {
  submissions: AssignmentSubmission[];
  maxScore: number;
  gradingId: number | null;
  error: string | null;
  onGrade: (submissionId: number, body: GradeSubmissionBody) => void;
}

function GradeForm({
  submission,
  maxScore,
  busy,
  onGrade,
}: {
  submission: AssignmentSubmission;
  maxScore: number;
  busy: boolean;
  onGrade: (body: GradeSubmissionBody) => void;
}) {
  const [score, setScore] = useState(submission.score === null ? '' : String(submission.score));
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [status, setStatus] = useState<'GRADED' | 'RETURNED'>(
    submission.status === 'RETURNED' ? 'RETURNED' : 'GRADED',
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseNumberInput(score);
    if (parsed === null || parsed < 0 || parsed > maxScore) {
      setError(`Score must be between 0 and ${maxScore}.`);
      return;
    }
    setError(null);
    const trimmed = feedback.trim();
    onGrade({ score: parsed, status, ...(trimmed ? { feedback: trimmed } : {}) });
  }

  return (
    <form
      className="mt-3 space-y-3 border-t border-outline-variant/30 pt-3"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField id={`grade-score-${submission.id}`} label={`Score (max ${maxScore})`} required>
          <Input
            id={`grade-score-${submission.id}`}
            type="number"
            min={0}
            max={maxScore}
            step="0.01"
            value={score}
            disabled={busy}
            onChange={(e) => setScore(e.target.value)}
          />
        </FormField>
        <FormField id={`grade-status-${submission.id}`} label="Result">
          <Select
            id={`grade-status-${submission.id}`}
            value={status}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value as 'GRADED' | 'RETURNED')}
          >
            <option value="GRADED">Graded</option>
            <option value="RETURNED">Returned</option>
          </Select>
        </FormField>
      </div>
      <FormField id={`grade-feedback-${submission.id}`} label="Feedback">
        <Textarea
          id={`grade-feedback-${submission.id}`}
          rows={2}
          value={feedback}
          disabled={busy}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </FormField>
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
        Save grade
      </Button>
    </form>
  );
}

/** Submission list with an inline grading form per submission (admin + teacher). */
export function SubmissionsPanel({
  submissions,
  maxScore,
  gradingId,
  error,
  onGrade,
}: SubmissionsPanelProps) {
  if (submissions.length === 0) {
    return (
      <EmptyState title="No submissions yet" description="Students have not submitted work." />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      <ul className="space-y-3">
        {submissions.map((submission) => (
          <li
            key={submission.id}
            className="border border-outline-variant/40 bg-surface-container-lowest p-4"
          >
            <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
              {submission.student
                ? personLabel(submission.student)
                : `Student #${submission.studentId}`}
              <StatusBadge status={submission.status} />
              {submission.score !== null ? (
                <span className="text-caption text-on-surface-variant">
                  {submission.score} / {maxScore}
                </span>
              ) : null}
            </p>
            <p className="text-caption text-on-surface-variant">
              Submitted {formatDateTime(submission.submittedAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-body-md text-on-surface">
              {submission.content}
            </p>
            <GradeForm
              key={`${submission.id}-${submission.updatedAt}`}
              submission={submission}
              maxScore={maxScore}
              busy={gradingId === submission.id}
              onGrade={(body) => onGrade(submission.id, body)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
