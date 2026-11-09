import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { AcademicTermsPanel } from '@/components/admin/sms/AcademicTermsPanel';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAcademicYear,
  deleteAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
} from '@/services/sms/academicYearService';
import type { SmsAcademicYear } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatDateOnly, toDateInputValue } from '@/utils/smsFormat';

const yearSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    code: z.string().trim().min(1, 'Code is required').max(50),
    startsOn: z.string().min(1, 'Start date is required'),
    endsOn: z.string().min(1, 'End date is required'),
    isCurrent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.startsOn && data.endsOn && data.endsOn < data.startsOn) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'End date must not be earlier than the start date',
      });
    }
  });

type YearFormValues = z.input<typeof yearSchema>;

const EMPTY_VALUES: YearFormValues = {
  name: '',
  code: '',
  startsOn: '',
  endsOn: '',
  isCurrent: false,
};
const PAGE_SIZE = 20;

interface PendingAction {
  year: SmsAcademicYear;
  action: 'delete' | 'setCurrent';
}

export default function AdminAcademicYearsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SmsAcademicYear | null>(null);
  const [termsYear, setTermsYear] = useState<SmsAcademicYear | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const query = { page, limit: PAGE_SIZE };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.academicYears.list(query),
    queryFn: ({ signal }) => listAcademicYears(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<YearFormValues>({
    resolver: zodResolver(yearSchema),
    defaultValues: EMPTY_VALUES,
  });

  function startEdit(year: SmsAcademicYear) {
    setEditing(year);
    reset({
      name: year.name,
      code: year.code,
      startsOn: toDateInputValue(year.startsOn),
      endsOn: toDateInputValue(year.endsOn),
      isCurrent: year.isCurrent,
    });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: YearFormValues) => {
      const parsed = yearSchema.parse(values);
      const body = {
        name: parsed.name,
        code: parsed.code,
        startsOn: parsed.startsOn,
        endsOn: parsed.endsOn,
      };
      if (editing) return updateAcademicYear(editing.id, body);
      return createAcademicYear({ ...body, isCurrent: parsed.isCurrent });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      const saved = response.data.academicYear;
      setTermsYear((current) => (current?.id === saved.id ? saved : current));
      startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.academicYears.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save academic year.'));
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ year, action }: PendingAction) =>
      action === 'delete' ? deleteAcademicYear(year.id) : setCurrentAcademicYear(year.id),
    onSuccess: async (response, variables) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPending(null);
      if (variables.action === 'delete') {
        if (editing?.id === variables.year.id) startCreate();
        if (termsYear?.id === variables.year.id) setTermsYear(null);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.academicYears.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to complete academic year action.'));
      setPending(null);
    },
  });

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Academic Years"
        description="Create academic years, choose the current year, and manage terms. Years with classes or enrollments cannot be deleted."
      />

      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}
      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? `Edit: ${editing.name}` : 'Create academic year'}
          </h2>
          <FormField id="year-name" label="Name" required error={errors.name?.message}>
            <Input id="year-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField id="year-code" label="Code" required error={errors.code?.message}>
            <Input id="year-code" disabled={busy} {...register('code')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="year-starts" label="Starts on" required error={errors.startsOn?.message}>
              <Input id="year-starts" type="date" disabled={busy} {...register('startsOn')} />
            </FormField>
            <FormField id="year-ends" label="Ends on" required error={errors.endsOn?.message}>
              <Input id="year-ends" type="date" disabled={busy} {...register('endsOn')} />
            </FormField>
          </div>
          {!editing ? (
            <Checkbox
              id="year-current"
              label="Set as current year"
              description="Clears the current flag on every other year."
              disabled={busy}
              {...register('isCurrent')}
            />
          ) : (
            <p className="text-caption text-on-surface-variant">
              Use “Set current” in the list to change the current academic year.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save academic year' : 'Create academic year'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div className="lg:col-span-3">
          {listQuery.isLoading ? <LoadingState message="Loading academic years…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load academic years.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No academic years yet"
              description="Create an academic year to start planning classes."
            />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((year) => (
                <li key={year.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-sans text-body-md text-primary">
                        {year.name}
                        {year.isCurrent ? <StatusBadge status="CURRENT" /> : null}
                      </p>
                      <p className="text-caption text-on-surface-variant">
                        Code {year.code} · {formatDateOnly(year.startsOn)} –{' '}
                        {formatDateOnly(year.endsOn)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={() => startEdit(year)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={() => setTermsYear(year)}
                      >
                        Terms
                      </Button>
                      {!year.isCurrent ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          disabled={actionMutation.isPending}
                          onClick={() => setPending({ year, action: 'setCurrent' })}
                        >
                          Set current
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        disabled={actionMutation.isPending}
                        onClick={() => setPending({ year, action: 'delete' })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Restore is not provided by the backend for academic years.
          </p>
        </div>
      </div>

      {termsYear ? (
        <AcademicTermsPanel
          key={termsYear.id}
          year={termsYear}
          onClose={() => setTermsYear(null)}
        />
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.action === 'delete' ? 'Delete this academic year?' : 'Set as current year?'}
        description={
          pending
            ? pending.action === 'delete'
              ? `${pending.year.name} and its terms will be soft-deleted. Deletion fails while class offerings or enrollments exist.`
              : `${pending.year.name} becomes the current academic year and every other year is unmarked.`
            : ''
        }
        confirmLabel={pending?.action === 'delete' ? 'Delete academic year' : 'Set current'}
        busy={actionMutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) actionMutation.mutate(pending);
        }}
      />
    </div>
  );
}
