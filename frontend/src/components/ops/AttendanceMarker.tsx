import { useState } from 'react';

import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import {
  ATTENDANCE_STATUSES,
  type AttendanceRecord,
  type AttendanceStatus,
  type BulkAttendanceRecordInput,
} from '@/types/ops.types';

export interface MarkableStudent {
  id: number;
  label: string;
}

interface AttendanceMarkerProps {
  students: MarkableStudent[];
  /** Existing records for the selected class + date (pre-fills the table). */
  records: AttendanceRecord[];
  saving: boolean;
  onSave: (records: BulkAttendanceRecordInput[]) => void;
}

interface RowState {
  status: AttendanceStatus;
  notes: string;
}

/**
 * Bulk attendance table. The parent should `key` this on class + date + loaded data so the
 * local row state re-initialises from the server records.
 */
export function AttendanceMarker({ students, records, saving, onSave }: AttendanceMarkerProps) {
  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const byStudent = new Map(records.map((record) => [record.studentId, record]));
    return Object.fromEntries(
      students.map((student) => {
        const existing = byStudent.get(student.id);
        return [
          student.id,
          { status: existing?.status ?? 'PRESENT', notes: existing?.notes ?? '' },
        ];
      }),
    );
  });

  function update(studentId: number, patch: Partial<RowState>) {
    setRows((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { status: 'PRESENT', notes: '' }), ...patch },
    }));
  }

  function markAll(status: AttendanceStatus) {
    setRows((current) =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          { ...(current[student.id] ?? { notes: '' }), status },
        ]),
      ),
    );
  }

  function handleSave() {
    onSave(
      students.map((student) => {
        const row = rows[student.id];
        const notes = row?.notes.trim() ?? '';
        return {
          studentId: student.id,
          status: row?.status ?? 'PRESENT',
          ...(notes ? { notes } : {}),
        };
      }),
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
          Mark all
        </span>
        {ATTENDANCE_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            variant="ghost"
            size="md"
            disabled={saving}
            onClick={() => markAll(status)}
          >
            {status}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant/40 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 text-primary">{student.label}</td>
                <td className="px-4 py-3">
                  <Select
                    aria-label={`Status for ${student.label}`}
                    value={rows[student.id]?.status ?? 'PRESENT'}
                    disabled={saving}
                    onChange={(e) =>
                      update(student.id, { status: e.target.value as AttendanceStatus })
                    }
                  >
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Input
                    aria-label={`Notes for ${student.label}`}
                    value={rows[student.id]?.notes ?? ''}
                    maxLength={500}
                    disabled={saving}
                    onChange={(e) => update(student.id, { notes: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={saving}
          disabled={saving || students.length === 0}
          onClick={handleSave}
        >
          Save attendance
        </Button>
      </div>
    </div>
  );
}
