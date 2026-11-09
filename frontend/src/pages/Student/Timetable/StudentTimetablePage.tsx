import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { TimetableWeekGrid } from '@/components/ops/TimetableWeekGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import { fetchStudentTimetable } from '@/services/student/studentTimetableService';
import { getErrorMessage } from '@/utils/apiMessage';

export default function StudentTimetablePage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: queryKeys.student.timetable,
    queryFn: ({ signal }) => fetchStudentTimetable({ signal }),
    select: (response) => response.data.items,
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const activeId = selectedId ?? items[0]?.id ?? null;
  const active = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [items, activeId],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="My Timetable"
        description="Published weekly schedule for your enrolled class."
      />

      {query.isLoading ? <LoadingState message="Loading your timetable…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load timetable.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No timetable yet"
          description="Your class schedule will appear here once the school publishes it."
        />
      ) : null}

      {items.length > 1 ? (
        <div className="max-w-md">
          <FormField id="stu-tt-select" label="Class timetable">
            <Select
              id="stu-tt-select"
              value={activeId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.classOffering?.name ?? `Timetable #${item.id}`}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      ) : null}

      {active ? (
        <>
          <p className="text-body-md text-on-surface-variant">
            {active.classOffering?.name}
            {active.academicYear ? ` · ${active.academicYear.name}` : ''}
          </p>
          <TimetableWeekGrid
            entries={active.entries ?? []}
            emptyMessage="This published timetable has no lessons yet."
          />
        </>
      ) : null}
    </div>
  );
}
