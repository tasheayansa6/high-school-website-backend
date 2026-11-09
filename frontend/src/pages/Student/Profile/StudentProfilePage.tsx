import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentProfileData } from '@/hooks/useStudentPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';
import { studentClassSubtitle } from '@/utils/studentFormat';

const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const DATE_ONLY: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

export default function StudentProfilePage() {
  const query = useStudentProfileData();
  const data = query.data;

  const rows: [string, string][] = data
    ? [
        ['Full name', `${data.student.firstName} ${data.student.lastName}`],
        ['Student code', data.student.studentCode],
        ['Email', data.student.email],
        ['Phone', data.student.phone ?? '—'],
        ['Gender', data.student.gender ?? '—'],
        ['Date of birth', formatPublishedDate(data.student.dateOfBirth, 'en', DATE_ONLY) || '—'],
        ['Guardian', data.student.guardianName ?? '—'],
        ['Guardian phone', data.student.guardianPhone ?? '—'],
        ['Last sign-in', formatPublishedDate(data.student.lastLoginAt, 'en', DATE_TIME) || '—'],
        ['Account created', formatPublishedDate(data.student.createdAt, 'en', DATE_TIME) || '—'],
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CmsSectionHeader
        eyebrow="Student portal"
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
              <StatusBadge status={data.student.isActive ? 'ACTIVE' : 'INACTIVE'} />
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

          <section aria-label="Enrollment summary" className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Classes" value={data.summary.classOfferings} icon="meeting_room" />
            <StatCard label="Subjects" value={data.summary.subjects} icon="menu_book" />
            <StatCard label="Teachers" value={data.summary.teachers} icon="groups" />
          </section>

          <section aria-label="Current enrollment">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Current enrollment</h2>
            {data.enrollments.length === 0 ? (
              <EmptyState
                title="No active enrollment"
                description="You are not enrolled in a class yet."
              />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {data.enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="border border-outline-variant/40 bg-surface-container-lowest p-5"
                  >
                    <p className="font-display text-headline-sm text-primary">
                      {enrollment.classOffering.name}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {studentClassSubtitle(enrollment.classOffering)}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={enrollment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
