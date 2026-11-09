import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentExamResults } from '@/hooks/useStudentOps';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateOnly } from '@/utils/smsFormat';

const PAGE_SIZE = 20;

export default function StudentResultsPage() {
  const [page, setPage] = useState(1);
  const query = useStudentExamResults({ page, limit: PAGE_SIZE });
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Exam Results"
        description="Published results for your examinations."
      />

      {query.isLoading ? <LoadingState message="Loading results…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load results.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="No exam results have been published for you."
        />
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant/40 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-primary">
                    {item.exam?.name ?? `Exam #${item.examId}`}
                    {item.exam?.examType ? (
                      <span className="block text-caption text-on-surface-variant">
                        {item.exam.examType}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {item.exam?.subject?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDateOnly(item.exam?.examDate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-primary">
                    {item.score}
                    {item.exam ? ` / ${item.exam.maxScore}` : ''}
                  </td>
                  <td className="px-4 py-3">{item.gradeLetter ?? '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{item.remarks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <PaginationControls pagination={query.data?.pagination} onPageChange={setPage} />
    </div>
  );
}
