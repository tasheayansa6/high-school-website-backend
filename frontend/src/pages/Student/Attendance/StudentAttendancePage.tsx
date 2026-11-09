import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentAttendance } from '@/hooks/useStudentOps';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateOnly } from '@/utils/smsFormat';

const PAGE_SIZE = 20;

export default function StudentAttendancePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | AttendanceStatus>('');

  const query = useStudentAttendance({
    page,
    limit: PAGE_SIZE,
    ...(status ? { status } : {}),
  });
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Attendance"
        description="Your attendance records, newest first."
      />

      <div className="mb-4 max-w-xs">
        <FormField id="s-att-status" label="Status">
          <Select
            id="s-att-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | AttendanceStatus);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {ATTENDANCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {query.isLoading ? <LoadingState message="Loading attendance…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load attendance.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No attendance records"
          description="Nothing has been recorded for you yet."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div>
                <p className="text-body-md text-primary">{formatDateOnly(item.attendanceDate)}</p>
                <p className="text-caption text-on-surface-variant">
                  {item.classOffering?.name ?? `Class #${item.classOfferingId}`}
                  {item.notes ? ` · ${item.notes}` : ''}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      ) : null}
      <PaginationControls pagination={query.data?.pagination} onPageChange={setPage} />
    </div>
  );
}
