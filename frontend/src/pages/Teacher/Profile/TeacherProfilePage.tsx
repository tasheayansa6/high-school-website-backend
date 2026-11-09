import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useTeacherProfileData } from '@/hooks/useTeacherPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

export default function TeacherProfilePage() {
  const query = useTeacherProfileData();
  const data = query.data;

  const rows: [string, string][] = data
    ? [
        ['Full name', `${data.teacher.firstName} ${data.teacher.lastName}`],
        ['Email', data.teacher.email],
        ['Employee code', data.teacher.employeeCode ?? '—'],
        ['Phone', data.teacher.phone ?? '—'],
        ['Last sign-in', formatPublishedDate(data.teacher.lastLoginAt, 'en', DATE_TIME) || '—'],
        ['Account created', formatPublishedDate(data.teacher.createdAt, 'en', DATE_TIME) || '—'],
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Profile"
        description="Your account details are managed by the academy administration."
      />

      {query.isLoading ? <LoadingState message="Loading your profile…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load your profile.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {data ? (
        <div className="flex flex-col gap-space-xl">
          <section
            aria-label="Account details"
            className="border border-outline-variant/40 bg-surface-container-lowest p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Account</h2>
              <StatusBadge status={data.teacher.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-body-md text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-label="Assignment summary"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard label="Classes" value={data.summary.classOfferings} icon="meeting_room" />
            <StatCard label="Subjects" value={data.summary.subjects} icon="menu_book" />
            <StatCard label="Students" value={data.summary.students} icon="groups" />
            <StatCard
              label="Assignments"
              value={data.summary.teachingAssignments}
              icon="assignment_ind"
              hint="Class + subject pairings"
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
