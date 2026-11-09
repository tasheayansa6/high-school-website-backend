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
import { fetchTeacherTimetable } from '@/services/teacher/teacherTimetableService';
import { type Weekday, WEEKDAY_LABELS, WEEKDAYS } from '@/types/timetable.types';
import { getErrorMessage } from '@/utils/apiMessage';

function todayWeekday(): Weekday {
  const map: Weekday[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  return map[new Date().getDay()] ?? 'MONDAY';
}

export default function TeacherTimetablePage() {
  const [dayFilter, setDayFilter] = useState<'' | Weekday>('');
  const today = todayWeekday();

  const query = useQuery({
    queryKey: queryKeys.teacher.timetable({ dayOfWeek: dayFilter || undefined }),
    queryFn: ({ signal }) =>
      fetchTeacherTimetable(dayFilter ? { dayOfWeek: dayFilter } : {}, { signal }),
    select: (response) => response.data.items,
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const todayItems = useMemo(
    () => items.filter((entry) => entry.dayOfWeek === today),
    [items, today],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Timetable"
        description="Published lessons assigned to you. Updates appear after the school publishes changes."
      />

      <div className="max-w-xs">
        <FormField id="tt-day-filter" label="Day filter">
          <Select
            id="tt-day-filter"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as '' | Weekday)}
          >
            <option value="">Full week</option>
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {WEEKDAY_LABELS[day]} ({day})
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {query.isLoading ? <LoadingState message="Loading your timetable…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load timetable.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && !dayFilter ? (
        <section className="space-y-3">
          <h2 className="font-display text-headline-sm text-primary">
            Today · {WEEKDAY_LABELS[today]}
          </h2>
          {todayItems.length === 0 ? (
            <EmptyState title="No classes today" description="Nothing published for today." />
          ) : (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {todayItems.map((entry) => (
                <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-body-md text-primary">
                      {entry.startTime}–{entry.endTime} ·{' '}
                      {entry.subject?.name ?? `Subject #${entry.subjectId}`}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {entry.timetable?.classOffering?.name}
                      {entry.classroom ? ` · ${entry.classroom.name}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {query.isSuccess ? (
        <TimetableWeekGrid
          entries={items}
          emptyMessage="No published lessons are assigned to you yet."
        />
      ) : null}
    </div>
  );
}
