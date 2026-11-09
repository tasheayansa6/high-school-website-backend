import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentAnnouncements } from '@/hooks/useStudentOps';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateTime } from '@/utils/opsFormat';

const PAGE_SIZE = 20;

export default function StudentAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const query = useStudentAnnouncements({ page, limit: PAGE_SIZE });
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Announcements"
        description="School and class announcements."
      />

      {query.isLoading ? <LoadingState message="Loading announcements…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load announcements.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState title="No announcements" description="There is nothing new right now." />
      ) : null}
      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border border-outline-variant/40 bg-surface-container-lowest p-5"
            >
              <p className="font-display text-headline-sm text-primary">{item.title}</p>
              <p className="text-caption text-on-surface-variant">
                {formatDateTime(item.publishedAt)}
                {item.classOffering ? ` · ${item.classOffering.name}` : ''}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-body-md text-on-surface">{item.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <PaginationControls pagination={query.data?.pagination} onPageChange={setPage} />
    </div>
  );
}
