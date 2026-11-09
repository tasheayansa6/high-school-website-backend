import { Link } from 'react-router-dom';

import { StatCard } from '@/components/admin/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { useStudentOverview } from '@/hooks/useStudentPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { studentClassSubtitle, teacherName } from '@/utils/studentFormat';

export default function StudentDashboardPage() {
  const query = useStudentOverview();
  const overview = query.data;
  const welcomeName = overview
    ? `${overview.student.firstName} ${overview.student.lastName}`.trim()
    : null;
  const enrollmentSummary = overview?.enrollments[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl">
      <Card className="overflow-hidden border-none bg-primary p-0 text-on-primary shadow-md">
        <div className="flex flex-col gap-4 bg-[radial-gradient(circle_at_100%_0%,rgb(183_154_89/0.25),transparent_45%)] p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Student portal
            </p>
            <h1 className="mb-2 break-words font-display text-headline-md text-on-primary">
              {welcomeName ? `Welcome, ${welcomeName}` : 'Dashboard'}
            </h1>
            <p className="max-w-2xl font-sans text-body-md text-on-primary/80">
              Your classes, subjects, and academic activity for the current enrollment.
            </p>
            {enrollmentSummary ? (
              <p className="mt-2 font-sans text-caption text-on-primary/65">
                {enrollmentSummary.classOffering.name} ·{' '}
                {studentClassSubtitle(enrollmentSummary.classOffering)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="onPrimary"
            size="md"
            onClick={() => void query.refetch()}
            isLoading={query.isFetching && !query.isLoading}
          >
            Refresh data
          </Button>
        </div>
      </Card>

      {query.isLoading ? <LoadingState message="Loading your overview…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load your overview.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {overview ? (
        <>
          <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="My classes"
              value={overview.counts.classOfferings}
              icon="meeting_room"
              hint="Active class enrollments"
            />
            <StatCard
              label="My subjects"
              value={overview.counts.subjects}
              icon="menu_book"
              hint="Subjects taught on your class"
            />
            <StatCard
              label="My teachers"
              value={overview.counts.teachers}
              icon="groups"
              hint="Teachers assigned to your subjects"
            />
          </section>

          <section aria-label="Current enrollment">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Current enrollment</h2>
              <Link
                to={STUDENT_ROUTES.classes}
                className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:underline"
              >
                View classes
              </Link>
            </div>
            {overview.enrollments.length === 0 ? (
              <EmptyState
                title="No active enrollment"
                description="You are not enrolled in a class yet. The academy administration will enroll you; it will appear here once done."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {overview.enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
                  >
                    <p className="font-display text-headline-sm text-primary">
                      {enrollment.classOffering.name}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {studentClassSubtitle(enrollment.classOffering)}
                    </p>
                    <p className="mt-3 text-caption text-on-surface-variant">
                      Homeroom: {teacherName(enrollment.classOffering.homeroomTeacher)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Subjects and teachers">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Subjects</h2>
              <Link
                to={STUDENT_ROUTES.subjects}
                className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:underline"
              >
                View all subjects
              </Link>
            </div>
            {overview.subjects.length === 0 ? (
              <EmptyState
                title="No subjects assigned yet"
                description="Subjects appear once teachers are assigned to your class."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
                <table className="min-w-full text-left">
                  <thead className="border-b border-outline-variant/40 bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">
                        Subject
                      </th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">
                        Teacher
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.subjects.map((subject) => (
                      <tr key={subject.id} className="border-b border-outline-variant/20">
                        <td className="px-4 py-3">
                          {subject.name}
                          <p className="text-caption text-on-surface-variant">{subject.code}</p>
                        </td>
                        <td className="px-4 py-3 text-body-sm">
                          {subject.teachers.map((entry) => teacherName(entry.teacher)).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
