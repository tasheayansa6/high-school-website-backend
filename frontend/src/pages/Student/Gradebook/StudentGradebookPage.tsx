import { useQuery } from '@tanstack/react-query';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import { getStudentGradebookSummary } from '@/services/student/studentGradebookService';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateOnly } from '@/utils/smsFormat';

export default function StudentGradebookPage() {
  const summary = useQuery({
    queryKey: queryKeys.student.gradebookSummary({}),
    queryFn: ({ signal }) => getStudentGradebookSummary({}, { signal }),
    select: (response) => response.data,
  });

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="My Grades"
        description="Published subject totals and assessment breakdowns for your enrolled classes."
      />

      {summary.isLoading ? <LoadingState message="Loading your grades…" /> : null}
      {summary.isError ? (
        <ErrorState
          message={getErrorMessage(summary.error, 'Unable to load gradebook.')}
          onRetry={() => void summary.refetch()}
        />
      ) : null}
      {summary.isSuccess && summary.data.subjects.length === 0 ? (
        <EmptyState
          title="No published results yet"
          description="Grades appear here after your teachers submit marks and an administrator publishes them."
        />
      ) : null}

      {summary.data ? (
        <>
          <div className="mb-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-5">
            <p className="text-sm uppercase tracking-wide text-on-surface-variant">Overall</p>
            <p className="mt-1 text-3xl font-semibold text-primary">
              {summary.data.summary.overallAveragePercent ?? '—'}%
              {summary.data.summary.overallGradeLetter
                ? ` · ${summary.data.summary.overallGradeLetter}`
                : ''}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {summary.data.summary.subjectCount} subjects · {summary.data.summary.assessmentCount}{' '}
              published assessments
              {summary.data.summary.overallGradeRemark
                ? ` · ${summary.data.summary.overallGradeRemark}`
                : ''}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {summary.data.subjects.map((subject) => (
              <article
                key={`${subject.subject.id}-${subject.academicTermId ?? 'none'}-${subject.academicYearId}`}
                className="rounded-xl border border-outline-variant/40 bg-surface p-4"
              >
                <h2 className="text-lg font-semibold text-primary">{subject.subject.name}</h2>
                <p className="text-sm text-on-surface-variant">
                  {subject.classOffering.name}
                  {subject.academicTerm ? ` · ${subject.academicTerm.name}` : ''}
                </p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">
                  {subject.totalPercent ?? '—'}%
                  {subject.gradeLetter ? ` · ${subject.gradeLetter}` : ''}
                </p>
                {subject.gradeRemark ? (
                  <p className="text-sm text-on-surface-variant">{subject.gradeRemark}</p>
                ) : null}
                <ul className="mt-4 space-y-2 text-sm">
                  {subject.assessments.map((assessment) => (
                    <li
                      key={assessment.id}
                      className="flex items-start justify-between gap-3 border-t border-outline-variant/40 pt-2"
                    >
                      <span>
                        <span className="font-medium">{assessment.name}</span>
                        <span className="block text-on-surface-variant">
                          {assessment.category?.name ?? assessment.examType}
                          {assessment.examDate ? ` · ${formatDateOnly(assessment.examDate)}` : ''}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-medium">
                        {assessment.score}/{assessment.maxScore}
                        {assessment.gradeLetter ? ` (${assessment.gradeLetter})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
