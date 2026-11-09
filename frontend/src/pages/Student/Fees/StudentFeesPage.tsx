import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useStudentFees } from '@/hooks/useStudentOps';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatDateTime, formatMoney } from '@/utils/opsFormat';
import { formatDateOnly } from '@/utils/smsFormat';

const PAGE_SIZE = 20;

export default function StudentFeesPage() {
  const [page, setPage] = useState(1);
  const query = useStudentFees({ page, limit: PAGE_SIZE });
  const items = query.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Student portal"
        title="Fees"
        description="Your fee balances and payment history."
      />

      {query.isLoading ? <LoadingState message="Loading fees…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error, 'Unable to load fees.')}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <EmptyState title="No fees" description="No fees have been assigned to you." />
      ) : null}
      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const currency = item.feeStructure?.currency ?? '';
            return (
              <li
                key={item.id}
                className="border border-outline-variant/40 bg-surface-container-lowest p-5"
              >
                <p className="flex flex-wrap items-center gap-2 font-display text-headline-sm text-primary">
                  {item.feeStructure?.name ?? `Fee #${item.feeStructureId}`}
                  <StatusBadge status={item.status} />
                </p>
                <p className="text-caption text-on-surface-variant">
                  {item.academicYear?.name ?? ''}
                  {item.academicTerm ? ` · ${item.academicTerm.name}` : ''}
                  {item.dueDate ? ` · Due ${formatDateOnly(item.dueDate)}` : ''}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <dt className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      Due
                    </dt>
                    <dd className="text-body-md tabular-nums text-primary">
                      {formatMoney(item.amountDue, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      Paid
                    </dt>
                    <dd className="text-body-md tabular-nums text-primary">
                      {formatMoney(item.amountPaid, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      Balance
                    </dt>
                    <dd className="text-body-md tabular-nums text-primary">
                      {formatMoney(item.balance, currency)}
                    </dd>
                  </div>
                </dl>
                {item.payments && item.payments.length > 0 ? (
                  <ul className="mt-4 divide-y divide-outline-variant/30 border-t border-outline-variant/30">
                    {item.payments.map((payment) => (
                      <li key={payment.id} className="flex justify-between gap-3 py-2 text-body-sm">
                        <span className="text-on-surface-variant">
                          {formatDateTime(payment.paidAt)}
                          {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
                        </span>
                        <span className="tabular-nums text-primary">
                          {formatMoney(payment.amount, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <PaginationControls pagination={query.data?.pagination} onPageChange={setPage} />
    </div>
  );
}
