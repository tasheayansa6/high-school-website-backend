import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import { listNewsletterSubscribers } from '@/services/cms/adminCommunicationsService';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatPublishedDate } from '@/utils/formatDate';

export default function AdminNewsletterPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const query = useMemo(() => ({ page, limit: 20, ...(q ? { q } : {}) }), [page, q]);

  const listQuery = useQuery({
    queryKey: queryKeys.cms.newsletter.list({ ...query }),
    queryFn: ({ signal }) => listNewsletterSubscribers(query, { signal }),
    select: (response) => response.data,
  });

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl">
      <CmsSectionHeader
        eyebrow="Website & inbox"
        title="Newsletter subscribers"
        description="Emails collected from the public website subscription forms."
      />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQ(searchInput.trim());
        }}
      >
        <FormField id="newsletter-search" label="Search" className="min-w-[16rem] flex-1">
          <Input
            id="newsletter-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Subscriber email"
          />
        </FormField>
        <button
          type="submit"
          className="min-h-control-h rounded-lg bg-primary px-5 font-label-caps text-label-caps uppercase tracking-wider text-on-primary"
        >
          Search
        </button>
      </form>

      {listQuery.isLoading ? <LoadingState message="Loading subscribers…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load subscribers.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No subscribers yet"
          description="When visitors subscribe on the website, they appear here after confirmation."
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
          <table className="min-w-full text-left">
            <thead className="border-b border-outline-variant/40 bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Email</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Joined</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant/20">
                  <td className="px-4 py-3 font-medium text-primary">{row.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                    {formatPublishedDate(row.createdAt, 'en', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}
