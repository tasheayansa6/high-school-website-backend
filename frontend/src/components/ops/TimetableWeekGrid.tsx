import {
  type TimetableEntry,
  type Weekday,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from '@/types/timetable.types';

interface TimetableWeekGridProps {
  entries: TimetableEntry[];
  onSelectEntry?: (entry: TimetableEntry) => void;
  emptyMessage?: string;
}

function personName(entry: TimetableEntry) {
  if (!entry.teacher) return '';
  return `${entry.teacher.firstName} ${entry.teacher.lastName}`.trim();
}

/** Compact weekly grid shared by admin/teacher/student timetable views. */
export function TimetableWeekGrid({
  entries,
  onSelectEntry,
  emptyMessage = 'No lessons scheduled.',
}: TimetableWeekGridProps) {
  const byDay = WEEKDAYS.reduce(
    (acc, day) => {
      acc[day] = entries
        .filter((entry) => entry.dayOfWeek === day && entry.isActive !== false)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    },
    {} as Record<Weekday, TimetableEntry[]>,
  );

  const hasAny = entries.some((entry) => entry.isActive !== false);

  if (!hasAny) {
    return (
      <p className="border border-dashed border-outline-variant/50 bg-surface-container-lowest px-4 py-8 text-center text-body-md text-on-surface-variant">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="min-h-[12rem] border border-outline-variant/30 bg-surface-container-lowest"
          >
            <p className="border-b border-outline-variant/30 bg-surface-container px-2 py-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              {WEEKDAY_LABELS[day]}
            </p>
            <ul className="space-y-2 p-2">
              {byDay[day].map((entry) => {
                const content = (
                  <>
                    <p className="font-sans text-caption font-medium text-primary">
                      {entry.startTime}–{entry.endTime}
                    </p>
                    <p className="text-body-sm text-on-surface">
                      {entry.subject?.name ?? `Subject #${entry.subjectId}`}
                    </p>
                    {entry.teacher ? (
                      <p className="text-caption text-on-surface-variant">{personName(entry)}</p>
                    ) : null}
                    {entry.classroom ? (
                      <p className="text-caption text-on-surface-variant">{entry.classroom.name}</p>
                    ) : null}
                    {entry.timetable?.classOffering ? (
                      <p className="text-caption text-on-surface-variant">
                        {entry.timetable.classOffering.name}
                      </p>
                    ) : null}
                  </>
                );
                return (
                  <li key={entry.id}>
                    {onSelectEntry ? (
                      <button
                        type="button"
                        onClick={() => onSelectEntry(entry)}
                        className="w-full border border-outline-variant/40 bg-surface px-2 py-2 text-left transition-colors hover:border-primary"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="border border-outline-variant/40 bg-surface px-2 py-2">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
