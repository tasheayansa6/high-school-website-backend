import { Link } from 'react-router-dom';

import { StatCard } from '@/components/admin/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherOverview } from '@/hooks/useTeacherPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { classSubtitle } from '@/utils/teacherFormat';

export default function TeacherDashboardPage() {
  const query = useTeacherOverview();
  const overview = query.data;
  const welcomeName = overview
    ? `${overview.teacher.firstName} ${overview.teacher.lastName}`.trim()
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl">
      <Card className="overflow-hidden border-none bg-primary p-0 text-on-primary shadow-md">
        <div className="flex flex-col gap-4 bg-[radial-gradient(circle_at_100%_0%,rgb(183_154_89/0.25),transparent_45%)] p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Teacher portal
            </p>
            <h1 className="mb-2 break-words font-display text-headline-md text-on-primary">
              {welcomeName ? `Welcome, ${welcomeName}` : 'Dashboard'}
            </h1>
            <p className="max-w-2xl font-sans text-body-md text-on-primary/80">
              Your classes, subjects, and teaching assignments from the live academy roster.
            </p>
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
              hint="Distinct class offerings assigned to you"
            />
            <StatCard
              label="My subjects"
              value={overview.counts.subjects}
              icon="menu_book"
              hint="Distinct subjects you teach"
            />
            <StatCard
              label="My students"
              value={overview.counts.students}
              icon="groups"
              hint="Active enrollments across your classes"
            />
          </section>

          <section aria-label="Recent assignments">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Recent assignments</h2>
              <Link
                to={TEACHER_ROUTES.classes}
                className="font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:underline"
              >
                View all classes
              </Link>
            </div>

            {overview.recentAssignments.length === 0 ? (
              <EmptyState
                title="No teaching assignments yet"
                description="An administrator assigns you to classes and subjects. They will appear here once assigned."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
                <table className="min-w-full text-left">
                  <thead className="border-b border-outline-variant/40 bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Class</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">
                        Subject
                      </th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentAssignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-outline-variant/20">
                        <td className="px-4 py-3">
                          <Link
                            to={TEACHER_ROUTES.classDetail(assignment.classOffering.id)}
                            className="font-medium text-primary hover:underline"
                          >
                            {assignment.classOffering.name}
                          </Link>
                          <p className="text-caption text-on-surface-variant">
                            {classSubtitle(assignment.classOffering)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {assignment.subject.name}
                          <p className="text-caption text-on-surface-variant">
                            {assignment.subject.code}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-body-sm">
                          {assignment.academicTerm?.name ?? 'Whole year'}
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
