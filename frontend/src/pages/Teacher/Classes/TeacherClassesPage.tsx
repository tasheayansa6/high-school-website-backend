import { Link } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherClasses } from '@/hooks/useTeacherPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { classSubtitle } from '@/utils/teacherFormat';

export default function TeacherClassesPage() {
  const query = useTeacherClasses();
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Classes"
        description="Class offerings you are assigned to teach."
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
          title="No classes assigned"
          description="You have no active teaching assignments yet."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((offering) => (
            <li key={offering.id}>
              <Link
                to={TEACHER_ROUTES.classDetail(offering.id)}
                className="block h-full border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm transition-colors hover:border-primary"
              >
                <p className="font-display text-headline-sm text-primary">{offering.name}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {classSubtitle(offering)}
                </p>
                <p className="mt-4 font-display text-headline-md tabular-nums text-primary">
                  {offering.enrollmentCount}
                  <span className="ml-2 font-sans text-caption text-on-surface-variant">
                    active {offering.enrollmentCount === 1 ? 'student' : 'students'}
                  </span>
                </p>
                <p className="mt-3 text-caption text-on-surface-variant">
                  {offering.subjects.map((subject) => subject.name).join(', ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
