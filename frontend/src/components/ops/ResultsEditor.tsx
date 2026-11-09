import { useState } from 'react';

import { FormAlert } from '@/components/forms/FormAlert';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import type { ExamResult, UpsertExamResultInput } from '@/types/ops.types';
import { parseNumberInput } from '@/utils/opsFormat';

import type { MarkableStudent } from './AttendanceMarker';

interface ResultsEditorProps {
  students: MarkableStudent[];
  results: ExamResult[];
  maxScore: number;
  saving: boolean;
  onSave: (results: UpsertExamResultInput[]) => void;
}

interface RowState {
  score: string;
  gradeLetter: string;
  remarks: string;
}

/**
 * Score entry table for an exam. Rows with a blank score are skipped on save.
 * The parent should `key` this on exam + loaded data.
 */
export function ResultsEditor({ students, results, maxScore, saving, onSave }: ResultsEditorProps) {
  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const byStudent = new Map(results.map((result) => [result.studentId, result]));
    return Object.fromEntries(
      students.map((student) => {
        const existing = byStudent.get(student.id);
        return [
          student.id,
          {
            score: existing ? String(existing.score) : '',
            gradeLetter: existing?.gradeLetter ?? '',
            remarks: existing?.remarks ?? '',
          },
        ];
      }),
    );
  });
  const [error, setError] = useState<string | null>(null);

  function update(studentId: number, patch: Partial<RowState>) {
    setRows((current) => ({
      ...current,
      [studentId]: { score: '', gradeLetter: '', remarks: '', ...current[studentId], ...patch },
    }));
  }

  function handleSave() {
    const payload: UpsertExamResultInput[] = [];
    for (const student of students) {
      const row = rows[student.id];
      if (!row || row.score.trim() === '') {
        continue;
      }
      const score = parseNumberInput(row.score);
      if (score === null || score < 0 || score > maxScore) {
        setError(`Score for ${student.label} must be a number between 0 and ${maxScore}.`);
        return;
      }
      const gradeLetter = row.gradeLetter.trim();
      const remarks = row.remarks.trim();
      payload.push({
        studentId: student.id,
        score,
        ...(gradeLetter ? { gradeLetter } : {}),
        ...(remarks ? { remarks } : {}),
      });
    }
    if (payload.length === 0) {
      setError('Enter at least one score.');
      return;
    }
    setError(null);
    onSave(payload);
  }

  return (
    <div>
      <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant/40 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Score (max {maxScore})</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 text-primary">{student.label}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min={0}
                    max={maxScore}
                    step="0.01"
                    aria-label={`Score for ${student.label}`}
                    value={rows[student.id]?.score ?? ''}
                    disabled={saving}
                    onChange={(e) => update(student.id, { score: e.target.value })}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    aria-label={`Grade for ${student.label}`}
                    value={rows[student.id]?.gradeLetter ?? ''}
                    maxLength={5}
                    disabled={saving}
                    onChange={(e) => update(student.id, { gradeLetter: e.target.value })}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    aria-label={`Remarks for ${student.label}`}
                    value={rows[student.id]?.remarks ?? ''}
                    maxLength={500}
                    disabled={saving}
                    onChange={(e) => update(student.id, { remarks: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <FormAlert tone="error" className="mt-4">
          {error}
        </FormAlert>
      ) : null}
      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={saving}
          disabled={saving || students.length === 0}
          onClick={handleSave}
        >
          Save results
        </Button>
      </div>
    </div>
  );
}
