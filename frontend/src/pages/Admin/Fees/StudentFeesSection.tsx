import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAcademicYearOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  assignStudentFee,
  deletePayment,
  deleteStudentFee,
  listFeeStructures,
  listPayments,
  listStudentFees,
  recordPayment,
  updateStudentFee,
} from '@/services/sms/feeService';
import { listStudents } from '@/services/sms/studentService';
import { FEE_PAYMENT_STATUSES, type FeePaymentStatus, type StudentFee } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatDateTime, formatMoney, personLabel, todayInputValue } from '@/utils/opsFormat';
import { formatDateOnly } from '@/utils/smsFormat';

const assignSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  feeStructureId: z.string().min(1, 'Fee structure is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  amountDue: z
    .string()
    .refine((value) => value.trim() === '' || Number(value) > 0, 'Amount must be greater than 0'),
  dueDate: z.string(),
  notes: z.string().trim().max(500),
});

type AssignValues = z.input<typeof assignSchema>;

const EMPTY_ASSIGN: AssignValues = {
  studentId: '',
  feeStructureId: '',
  academicYearId: '',
  amountDue: '',
  dueDate: '',
  notes: '',
};

const paymentSchema = z.object({
  amount: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) > 0, 'Amount must be greater than 0'),
  paymentMethod: z.string().trim().max(50),
  reference: z.string().trim().max(100),
  paidAt: z.string(),
  notes: z.string().trim().max(500),
});

type PaymentValues = z.input<typeof paymentSchema>;

const PAGE_SIZE = 20;

function PaymentsPanel({ fee, onClose }: { fee: StudentFee; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const payments = useQuery({
    queryKey: queryKeys.sms.studentFees.payments(fee.id),
    queryFn: ({ signal }) => listPayments(fee.id, { signal }),
    select: (response) => response.data,
  });
  const current = payments.data?.studentFee ?? fee;
  const currency = current.feeStructure?.currency ?? '';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: '',
      paymentMethod: '',
      reference: '',
      paidAt: todayInputValue(),
      notes: '',
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.studentFees.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.reports.all });
  };

  const payMutation = useMutation({
    mutationFn: (values: PaymentValues) => {
      const parsed = paymentSchema.parse(values);
      return recordPayment(fee.id, {
        amount: Number(parsed.amount),
        ...(parsed.paymentMethod.trim() ? { paymentMethod: parsed.paymentMethod.trim() } : {}),
        ...(parsed.reference.trim() ? { reference: parsed.reference.trim() } : {}),
        ...(parsed.paidAt ? { paidAt: parsed.paidAt } : {}),
        ...(parsed.notes.trim() ? { notes: parsed.notes.trim() } : {}),
      });
    },
    onSuccess: async (response) => {
      setFormError(null);
      setMessage(response.message);
      reset({ amount: '', paymentMethod: '', reference: '', paidAt: todayInputValue(), notes: '' });
      await refresh();
    },
    onError: (error) => {
      setMessage(null);
      if (!applyApiFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Unable to record the payment.'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => deletePayment(fee.id, paymentId),
    onSuccess: async (response) => {
      setFormError(null);
      setMessage(response.message);
      setPendingDelete(null);
      await refresh();
    },
    onError: (error) => {
      setPendingDelete(null);
      setFormError(getErrorMessage(error, 'Unable to delete the payment.'));
    },
  });

  const busy = isSubmitting || payMutation.isPending;

  return (
    <section className="border border-outline-variant/40 bg-surface-container-low p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Payments</h2>
          <p className="text-caption text-on-surface-variant">
            {current.student ? personLabel(current.student) : `Student #${current.studentId}`} ·{' '}
            {current.feeStructure?.name ?? `Fee #${current.feeStructureId}`}
          </p>
          <p className="text-caption text-on-surface-variant">
            Due {formatMoney(current.amountDue, currency)} · Paid{' '}
            {formatMoney(current.amountPaid, currency)} · Balance{' '}
            {formatMoney(current.balance, currency)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Close
        </Button>
      </div>

      {message ? (
        <FormAlert tone="success" className="mb-4">
          {message}
        </FormAlert>
      ) : null}
      {formError ? (
        <FormAlert tone="error" className="mb-4">
          {formError}
        </FormAlert>
      ) : null}

      {payments.isLoading ? <LoadingState message="Loading payments…" /> : null}
      {payments.isError ? (
        <ErrorState
          message={getErrorMessage(payments.error, 'Unable to load payments.')}
          onRetry={() => void payments.refetch()}
        />
      ) : null}
      {payments.isSuccess && payments.data.items.length === 0 ? (
        <p className="mb-4 text-body-sm text-on-surface-variant">No payments recorded yet.</p>
      ) : null}
      {payments.isSuccess && payments.data.items.length > 0 ? (
        <ul className="mb-4 divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
          {payments.data.items.map((payment) => (
            <li key={payment.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-body-md text-primary">{formatMoney(payment.amount, currency)}</p>
                <p className="text-caption text-on-surface-variant">
                  {formatDateTime(payment.paidAt)}
                  {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
                  {payment.reference ? ` · Ref ${payment.reference}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setPendingDelete(payment.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="space-y-3 border-t border-outline-variant/40 pt-4"
        onSubmit={handleSubmit((values) => payMutation.mutate(values))}
        noValidate
      >
        <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
          Record payment
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField id="pay-amount" label="Amount" required error={errors.amount?.message}>
            <Input
              id="pay-amount"
              type="number"
              min={0}
              step="0.01"
              disabled={busy}
              hasError={Boolean(errors.amount)}
              {...register('amount')}
            />
          </FormField>
          <FormField id="pay-date" label="Paid on" error={errors.paidAt?.message}>
            <Input id="pay-date" type="date" disabled={busy} {...register('paidAt')} />
          </FormField>
          <FormField id="pay-method" label="Method" error={errors.paymentMethod?.message}>
            <Input id="pay-method" disabled={busy} {...register('paymentMethod')} />
          </FormField>
          <FormField id="pay-ref" label="Reference" error={errors.reference?.message}>
            <Input id="pay-ref" disabled={busy} {...register('reference')} />
          </FormField>
        </div>
        <FormField id="pay-notes" label="Notes" error={errors.notes?.message}>
          <Input id="pay-notes" disabled={busy} {...register('notes')} />
        </FormField>
        <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
          Record payment
        </Button>
      </form>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this payment?"
        description="The payment is removed and the fee balance is recalculated."
        confirmLabel="Delete payment"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete !== null) deleteMutation.mutate(pendingDelete);
        }}
      />
    </section>
  );
}

export function StudentFeesSection() {
  const queryClient = useQueryClient();
  const canListStudents = usePermission(PERMISSIONS.STUDENTS_MANAGE);
  const [paymentsFor, setPaymentsFor] = useState<StudentFee | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentFee | null>(null);
  const [pendingWaive, setPendingWaive] = useState<StudentFee | null>(null);
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | FeePaymentStatus>('');
  const [page, setPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(studentSearch.trim(), 300);
  const years = useAcademicYearOptions();

  const structureQuery = { page: 1, limit: 100, isActive: true };
  const structures = useQuery({
    queryKey: queryKeys.sms.feeStructures.list({ ...structureQuery }),
    queryFn: ({ signal }) => listFeeStructures(structureQuery, { signal }),
    select: (response) => response.data.items,
  });

  const studentQuery = useMemo(
    () => ({
      page: 1,
      limit: 50,
      sortBy: 'lastName' as const,
      sortOrder: 'asc' as const,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    }),
    [debouncedSearch],
  );
  const students = useQuery({
    queryKey: queryKeys.sms.students.list({ ...studentQuery }),
    queryFn: ({ signal }) => listStudents(studentQuery, { signal }),
    select: (response) => response.data.items,
    enabled: canListStudents,
  });

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(yearFilter ? { academicYearId: Number(yearFilter) } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.studentFees.list({ ...query }),
    queryFn: ({ signal }) => listStudentFees(query, { signal }),
    select: (response) => response.data,
  });
  const items = listQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssignValues>({ resolver: zodResolver(assignSchema), defaultValues: EMPTY_ASSIGN });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.studentFees.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.reports.all });
  };

  const assignMutation = useMutation({
    mutationFn: (values: AssignValues) => {
      const parsed = assignSchema.parse(values);
      return assignStudentFee({
        studentId: Number(parsed.studentId),
        feeStructureId: Number(parsed.feeStructureId),
        academicYearId: Number(parsed.academicYearId),
        ...(parsed.amountDue.trim() ? { amountDue: Number(parsed.amountDue) } : {}),
        ...(parsed.dueDate ? { dueDate: parsed.dueDate } : {}),
        ...(parsed.notes.trim() ? { notes: parsed.notes.trim() } : {}),
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      reset(EMPTY_ASSIGN);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      if (!applyApiFieldErrors(error, setError)) {
        setActionError(getErrorMessage(error, 'Unable to assign the fee.'));
      }
    },
  });

  const waiveMutation = useMutation({
    mutationFn: (id: number) => updateStudentFee(id, { waived: true }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingWaive(null);
      await invalidate();
    },
    onError: (error) => {
      setPendingWaive(null);
      setActionError(getErrorMessage(error, 'Unable to waive the fee.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStudentFee(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      if (paymentsFor?.id === response.data.studentFee.id) setPaymentsFor(null);
      setPendingDelete(null);
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete the fee.'));
    },
  });

  const busy = isSubmitting || assignMutation.isPending;

  return (
    <div>
      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}
      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {paymentsFor ? (
            <PaymentsPanel
              key={paymentsFor.id}
              fee={paymentsFor}
              onClose={() => setPaymentsFor(null)}
            />
          ) : (
            <form
              className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
              onSubmit={handleSubmit((values) => assignMutation.mutate(values))}
              noValidate
            >
              <h2 className="font-display text-headline-sm text-primary">Assign fee to student</h2>
              <FormField
                id="sf-student-search"
                label="Find student"
                hint="Search by name, email, or student code."
              >
                <Input
                  id="sf-student-search"
                  value={studentSearch}
                  disabled={busy || !canListStudents}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </FormField>
              <FormField id="sf-student" label="Student" required error={errors.studentId?.message}>
                <Select
                  id="sf-student"
                  disabled={busy || !canListStudents}
                  hasError={Boolean(errors.studentId)}
                  {...register('studentId')}
                >
                  <option value="">
                    {students.isLoading ? 'Loading students…' : 'Select student'}
                  </option>
                  {(students.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.studentCode})
                    </option>
                  ))}
                </Select>
              </FormField>
              {!canListStudents ? (
                <FormAlert tone="info">
                  Listing students requires the students:manage permission.
                </FormAlert>
              ) : null}
              <FormField
                id="sf-structure"
                label="Fee structure"
                required
                error={errors.feeStructureId?.message}
              >
                <Select
                  id="sf-structure"
                  disabled={busy}
                  hasError={Boolean(errors.feeStructureId)}
                  {...register('feeStructureId')}
                >
                  <option value="">Select fee structure</option>
                  {(structures.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatMoney(item.amount, item.currency)})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="sf-year"
                label="Academic year"
                required
                error={errors.academicYearId?.message}
              >
                <Select
                  id="sf-year"
                  disabled={busy}
                  hasError={Boolean(errors.academicYearId)}
                  {...register('academicYearId')}
                >
                  <option value="">Select academic year</option>
                  {(years.data ?? []).map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  id="sf-amount"
                  label="Amount due"
                  hint="Optional. Defaults to the structure amount."
                  error={errors.amountDue?.message}
                >
                  <Input
                    id="sf-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={busy}
                    hasError={Boolean(errors.amountDue)}
                    {...register('amountDue')}
                  />
                </FormField>
                <FormField id="sf-due" label="Due date" error={errors.dueDate?.message}>
                  <Input id="sf-due" type="date" disabled={busy} {...register('dueDate')} />
                </FormField>
              </div>
              <FormField id="sf-notes" label="Notes" error={errors.notes?.message}>
                <Input id="sf-notes" disabled={busy} {...register('notes')} />
              </FormField>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={busy}
                disabled={busy || !canListStudents}
              >
                Assign fee
              </Button>
            </form>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField id="sf-filter-year" label="Academic year">
              <Select
                id="sf-filter-year"
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All years</option>
                {(years.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="sf-filter-status" label="Status">
              <Select
                id="sf-filter-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as '' | FeePaymentStatus);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {FEE_PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading student fees…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load student fees.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No student fees found"
              description="Assign a fee to a student or adjust the filters."
            />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((item) => {
                const currency = item.feeStructure?.currency ?? '';
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                  >
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
                        {item.student ? personLabel(item.student) : `Student #${item.studentId}`}
                        <StatusBadge status={item.status} />
                      </p>
                      <p className="text-caption text-on-surface-variant">
                        {item.feeStructure?.name ?? `Fee #${item.feeStructureId}`} ·{' '}
                        {item.academicYear?.name ?? item.academicYearId}
                      </p>
                      <p className="text-caption text-on-surface-variant">
                        Due {formatMoney(item.amountDue, currency)} · Paid{' '}
                        {formatMoney(item.amountPaid, currency)} · Balance{' '}
                        {formatMoney(item.balance, currency)}
                        {item.dueDate ? ` · Due ${formatDateOnly(item.dueDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status !== 'WAIVED' ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => setPaymentsFor(item)}
                        >
                          Payments
                        </Button>
                      ) : null}
                      {item.status !== 'WAIVED' && item.status !== 'PAID' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => setPendingWaive(item)}
                        >
                          Waive
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={() => setPendingDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={pendingWaive !== null}
        title="Waive this fee?"
        description="A waived fee no longer accepts payments and is excluded from expected revenue."
        confirmLabel="Waive fee"
        busy={waiveMutation.isPending}
        onCancel={() => setPendingWaive(null)}
        onConfirm={() => {
          if (pendingWaive) waiveMutation.mutate(pendingWaive.id);
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this student fee?"
        description="The fee assignment will be removed."
        confirmLabel="Delete"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
