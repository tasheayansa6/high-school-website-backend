import { Link } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherSubjects } from '@/hooks/useTeacherPortal';
import { getErrorMessage } from '@/utils/apiMessage';

export default function TeacherSubjectsPage() {
  const query = useTeacherSubjects();
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Subjects"
        description="Subjects you teach and the classes they are taught in."
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
          title="No subjects assigned"
          description="You have no active teaching assignments yet."
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
                Taught in
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {subject.classOfferings.map((offering) => (
                  <li key={offering.id}>
                    <Link
                      to={TEACHER_ROUTES.classDetail(offering.id)}
                      className="inline-flex bg-primary-fixed px-3 py-1 text-body-sm text-on-primary-fixed hover:underline"
                    >
                      {offering.name} · {offering.academicYear.name}
                    </Link>
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
