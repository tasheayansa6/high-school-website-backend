import { Link, useParams } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useTeacherClass } from '@/hooks/useTeacherPortal';
import { ApiClientError } from '@/services/api/apiError';
import { getErrorMessage } from '@/utils/apiMessage';
import { personName } from '@/utils/smsFormat';
import { classSubtitle } from '@/utils/teacherFormat';

export default function TeacherClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const parsed = Number(id);
  const classId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const query = useTeacherClass(classId);
  const detail = query.data;

  const notFound =
    classId === null || (query.error instanceof ApiClientError && query.error.status === 404);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title={detail ? detail.classOffering.name : 'Class'}
        description={detail ? classSubtitle(detail.classOffering) : ''}
      >
        <Link to={TEACHER_ROUTES.classes}>
          <Button type="button" variant="ghost" size="md">
            Back to classes
          </Button>
        </Link>
      </CmsSectionHeader>

      {notFound ? (
        <EmptyState
          title="Class not found"
          description="This class does not exist or is not assigned to you."
        />
      ) : null}
      {!notFound && query.isLoading ? <LoadingState message="Loading class…" /> : null}
      {!notFound && query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load this class.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {detail ? (
        <div className="flex flex-col gap-space-xl">
          <section aria-label="Class information" className="grid gap-4 md:grid-cols-3">
            <div className="border border-outline-variant/40 bg-surface-container-lowest p-5">
              <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                Academic year
              </p>
              <p className="mt-2 text-body-md text-primary">
                {detail.classOffering.academicYear.name}
              </p>
            </div>
            <div className="border border-outline-variant/40 bg-surface-container-lowest p-5">
              <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                Homeroom teacher
              </p>
              <p className="mt-2 text-body-md text-primary">
                {detail.classOffering.homeroomTeacher
                  ? personName(detail.classOffering.homeroomTeacher)
                  : 'Not assigned'}
              </p>
            </div>
            <div className="border border-outline-variant/40 bg-surface-container-lowest p-5">
              <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                Active students
              </p>
              <p className="mt-2 font-display text-headline-md tabular-nums text-primary">
                {detail.classOffering.enrollmentCount}
              </p>
            </div>
          </section>

          <section aria-label="Subjects you teach in this class">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Your subjects</h2>
            <ul className="flex flex-wrap gap-3">
              {detail.subjects.map((subject) => (
                <li
                  key={subject.assignmentId}
                  className="border border-outline-variant/40 bg-surface-container-lowest px-4 py-3"
                >
                  <p className="font-medium text-primary">{subject.name}</p>
                  <p className="text-caption text-on-surface-variant">
                    {subject.code} · {subject.academicTerm?.name ?? 'Whole year'}
                    {subject.isPrimary ? ' · Primary' : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Students">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Students</h2>
            {detail.students.length === 0 ? (
              <EmptyState
                title="No active students"
                description="No students are currently enrolled in this class."
              />
            ) : (
              <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
                <table className="min-w-full text-left">
                  <thead className="border-b border-outline-variant/40 bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Name</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Code</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Email</th>
                      <th className="px-4 py-3 font-label-caps text-label-caps uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((student) => (
                      <tr key={student.id} className="border-b border-outline-variant/20">
                        <td className="px-4 py-3">{personName(student)}</td>
                        <td className="px-4 py-3 text-body-sm">{student.studentCode}</td>
                        <td className="px-4 py-3 text-body-sm">{student.email}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={student.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
