import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentSubjects } from '@/hooks/useStudentPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { teacherName } from '@/utils/studentFormat';

export default function StudentSubjectsPage() {
  const query = useStudentSubjects();
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="My Subjects"
        description="Subjects taught on your current class and their assigned teachers."
      />

      {query.isLoading ? <LoadingState message="Loading your subjects…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load your subjects.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Subjects appear once you are enrolled and teachers are assigned to your class."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((subject) => (
            <li
              key={subject.id}
              className="border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
            >
              <p className="font-display text-headline-sm text-primary">{subject.name}</p>
              <p className="text-caption text-on-surface-variant">{subject.code}</p>
              {subject.description ? (
                <p className="mt-2 text-body-sm text-on-surface-variant">{subject.description}</p>
              ) : null}
              <p className="mt-4 font-label-caps text-label-caps uppercase tracking-wider text-secondary">
                Taught by
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {subject.teachers.map((entry) => (
                  <li
                    key={entry.assignmentId}
                    className="inline-flex bg-primary-fixed px-3 py-1 text-body-sm text-on-primary-fixed"
                  >
                    {teacherName(entry.teacher)}
                    {entry.isPrimary ? ' · Primary' : ''}
                    {entry.academicTerm ? ` · ${entry.academicTerm.name}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
