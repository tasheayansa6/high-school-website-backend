import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentClasses } from '@/hooks/useStudentPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';
import { studentClassSubtitle, teacherName } from '@/utils/studentFormat';

export default function StudentClassesPage() {
  const query = useStudentClasses();
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="My Classes"
        description="Classes you are currently enrolled in."
      />

      {query.isLoading ? <LoadingState message="Loading your classes…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load your classes.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No active enrollment"
          description="You are not enrolled in a class yet. The academy administration will enroll you."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((offering) => (
            <li
              key={offering.id}
              className="h-full border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
            >
              <p className="font-display text-headline-sm text-primary">{offering.name}</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {studentClassSubtitle(offering)}
              </p>
              <p className="mt-4 font-display text-headline-md tabular-nums text-primary">
                {offering.subjectCount}
                <span className="ml-2 font-sans text-caption text-on-surface-variant">
                  {offering.subjectCount === 1 ? 'subject' : 'subjects'}
                </span>
              </p>
              <p className="mt-3 text-caption text-on-surface-variant">
                Homeroom: {teacherName(offering.homeroomTeacher)}
              </p>
              <p className="mt-1 text-caption text-on-surface-variant">
                Enrolled {formatPublishedDate(offering.enrolledAt, 'en') || '—'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
