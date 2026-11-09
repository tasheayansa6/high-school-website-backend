import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAcademicYearOptions, useClassOfferingOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import { fetchReportOverview } from '@/services/sms/reportService';
import {
  ATTENDANCE_STATUSES,
  FEE_PAYMENT_STATUSES,
  type ReportOverviewQuery,
} from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { formatMoney, formatPercent } from '@/utils/opsFormat';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-outline-variant/40 bg-surface-container-lowest p-5">
      <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 font-display text-headline-md tabular-nums text-primary">{value}</p>
      {hint ? <p className="mt-1 text-caption text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

interface Filters {
  academicYearId: string;
  classOfferingId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { academicYearId: '', classOfferingId: '', from: '', to: '' };

export default function AdminReportsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const years = useAcademicYearOptions();
  const classes = useClassOfferingOptions(
    filters.academicYearId ? Number(filters.academicYearId) : undefined,
  );

  const query: ReportOverviewQuery = {
    ...(filters.academicYearId ? { academicYearId: Number(filters.academicYearId) } : {}),
    ...(filters.classOfferingId ? { classOfferingId: Number(filters.classOfferingId) } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  };
  const overview = useQuery({
    queryKey: queryKeys.sms.reports.overview({ ...query }),
    queryFn: ({ signal }) => fetchReportOverview(query, { signal }),
    select: (response) => response.data,
  });
  const data = overview.data;
  const currencyHint = 'Waived fees are excluded from expected revenue.';

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Reports"
        description="Attendance, fees, examinations, and enrollment at a glance."
      >
        <Button type="button" variant="ghost" size="md" onClick={() => setFilters(EMPTY_FILTERS)}>
          Reset filters
        </Button>
      </CmsSectionHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FormField id="rep-year" label="Academic year">
          <Select
            id="rep-year"
            value={filters.academicYearId}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                academicYearId: e.target.value,
                classOfferingId: '',
              }))
            }
          >
            <option value="">All years</option>
            {(years.data ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="rep-class" label="Class">
          <Select
            id="rep-class"
            value={filters.classOfferingId}
            onChange={(e) =>
              setFilters((current) => ({ ...current, classOfferingId: e.target.value }))
            }
          >
            <option value="">All classes</option>
            {(classes.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="rep-from" label="Attendance from">
          <Input
            id="rep-from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))}
          />
        </FormField>
        <FormField id="rep-to" label="Attendance to">
          <Input
            id="rep-to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))}
          />
        </FormField>
      </div>

      {overview.isLoading ? <LoadingState message="Loading report…" /> : null}
      {overview.isError ? (
        <ErrorState
          message={getErrorMessage(overview.error, 'Unable to load the report.')}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      {data ? (
        <div className="flex flex-col gap-space-xl">
          <section aria-label="Attendance">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Attendance</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Attendance rate"
                value={formatPercent(data.attendance.attendanceRate)}
                hint="Present + late"
              />
              <StatCard label="Records" value={String(data.attendance.total)} />
              {ATTENDANCE_STATUSES.map((status) => (
                <StatCard
                  key={status}
                  label={status}
                  value={String(data.attendance.byStatus[status] ?? 0)}
                />
              ))}
            </div>
          </section>

          <section aria-label="Fees">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Fees</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatCard label="Student fees" value={String(data.fees.count)} />
              <StatCard
                label="Expected"
                value={formatMoney(data.fees.totalDue)}
                hint={currencyHint}
              />
              <StatCard label="Collected" value={formatMoney(data.fees.totalPaid)} />
              <StatCard label="Outstanding" value={formatMoney(data.fees.totalOutstanding)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {FEE_PAYMENT_STATUSES.map((status) => (
                <div
                  key={status}
                  className="border border-outline-variant/40 bg-surface-container-lowest p-4"
                >
                  <StatusBadge status={status} />
                  <p className="mt-2 text-body-md text-primary">
                    {data.fees.byStatus[status]?.count ?? 0} fees
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    Paid {formatMoney(data.fees.byStatus[status]?.amountPaid)} of{' '}
                    {formatMoney(data.fees.byStatus[status]?.amountDue)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Enrollment">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Enrollment</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <StatCard label="Total" value={String(data.enrollments.total)} />
              {Object.entries(data.enrollments.byStatus).map(([status, count]) => (
                <StatCard key={status} label={status} value={String(count)} />
              ))}
            </div>
            {data.enrollments.activeByClassOffering.length > 0 ? (
              <ul className="mt-4 divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
                {data.enrollments.activeByClassOffering.map((row) => (
                  <li key={row.classOfferingId} className="flex justify-between gap-3 px-4 py-3">
                    <span className="text-body-md text-primary">
                      {row.name ?? `Class #${row.classOfferingId}`}
                    </span>
                    <span className="text-body-md tabular-nums text-on-surface-variant">
                      {row.activeStudents} active
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-label="Examinations">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Examinations</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard label="Examinations" value={String(data.exams.examCount)} />
              <StatCard
                label="Overall average"
                value={formatPercent(data.exams.overallAveragePercent)}
                hint="Mean of per-exam averages"
              />
            </div>
            {data.exams.items.length === 0 ? (
              <EmptyState title="No examinations" description="No exams match these filters." />
            ) : (
              <div className="mt-4 overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
                <table className="w-full text-left text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant/40 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3">Class / subject</th>
                      <th className="px-4 py-3">Results</th>
                      <th className="px-4 py-3">Average</th>
                      <th className="px-4 py-3">Min / max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.exams.items.map((exam) => (
                      <tr key={exam.examId}>
                        <td className="px-4 py-3 text-primary">
                          {exam.name}{' '}
                          <StatusBadge status={exam.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {exam.classOffering?.name ?? '—'} · {exam.subject?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{exam.resultCount}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {exam.averageScore ?? '—'}
                          {exam.maxScore ? ` / ${exam.maxScore}` : ''} (
                          {formatPercent(exam.averagePercent)})
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {exam.minScore ?? '—'} / {exam.maxRecordedScore ?? '—'}
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
