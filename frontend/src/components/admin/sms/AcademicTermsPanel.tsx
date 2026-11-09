import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAcademicTerm,
  listAcademicTerms,
  updateAcademicTerm,
} from '@/services/sms/academicYearService';
import type { SmsAcademicTerm, SmsAcademicYear } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatDateOnly, toDateInputValue } from '@/utils/smsFormat';

interface AcademicTermsPanelProps {
  year: SmsAcademicYear;
  onClose: () => void;
}

function buildTermSchema(year: SmsAcademicYear) {
  const yearStart = toDateInputValue(year.startsOn);
  const yearEnd = toDateInputValue(year.endsOn);

  return z
    .object({
      name: z.string().trim().min(1, 'Name is required').max(100),
      sequence: z
        .string()
        .trim()
        .regex(/^\d+$/, 'Sequence must be a whole number')
        .refine((value) => Number(value) >= 1 && Number(value) <= 20, {
          message: 'Sequence must be between 1 and 20',
        }),
      startsOn: z.string().min(1, 'Start date is required'),
      endsOn: z.string().min(1, 'End date is required'),
    })
    .superRefine((data, ctx) => {
      if (data.startsOn && data.endsOn && data.endsOn < data.startsOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['endsOn'],
          message: 'End date must not be earlier than the start date',
        });
      }
      if (data.startsOn && yearStart && data.startsOn < yearStart) {
        ctx.addIssue({
          code: 'custom',
          path: ['startsOn'],
          message: 'Term dates must fall within the academic year',
        });
      }
      if (data.endsOn && yearEnd && data.endsOn > yearEnd) {
        ctx.addIssue({
          code: 'custom',
          path: ['endsOn'],
          message: 'Term dates must fall within the academic year',
        });
      }
    });
}

type TermFormValues = z.input<ReturnType<typeof buildTermSchema>>;

const EMPTY_VALUES: TermFormValues = { name: '', sequence: '', startsOn: '', endsOn: '' };

export function AcademicTermsPanel({ year, onClose }: AcademicTermsPanelProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SmsAcademicTerm | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const schema = useMemo(() => buildTermSchema(year), [year]);

  const termsQuery = useQuery({
    queryKey: queryKeys.sms.academicYears.terms(year.id),
    queryFn: ({ signal }) => listAcademicTerms(year.id, { signal }),
    select: (response) => response.data.items,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TermFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  function startEdit(term: SmsAcademicTerm) {
    setEditing(term);
    reset({
      name: term.name,
      sequence: String(term.sequence),
      startsOn: toDateInputValue(term.startsOn),
      endsOn: toDateInputValue(term.endsOn),
    });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    reset(EMPTY_VALUES);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: TermFormValues) => {
      const parsed = schema.parse(values);
      const body = {
        name: parsed.name,
        sequence: Number(parsed.sequence),
        startsOn: parsed.startsOn,
        endsOn: parsed.endsOn,
      };
      if (editing) return updateAcademicTerm(year.id, editing.id, body);
      return createAcademicTerm(year.id, body);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      startCreate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sms.academicYears.terms(year.id),
      });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save term.'));
    },
  });

  const busy = isSubmitting || saveMutation.isPending;
  const terms = termsQuery.data ?? [];

  return (
    <section
      aria-label={`Terms for ${year.name}`}
      className="mt-8 border border-outline-variant/40 bg-surface-container-lowest p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Terms — {year.name}</h2>
          <p className="text-caption text-on-surface-variant">
            {formatDateOnly(year.startsOn)} – {formatDateOnly(year.endsOn)}. Term dates must fall
            inside the academic year and sequences must be unique.
          </p>
        </div>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Close terms
        </Button>
      </div>

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
            {editing ? `Edit term: ${editing.name}` : 'Add term'}
          </h3>
          <FormField id="term-name" label="Name" required error={errors.name?.message}>
            <Input id="term-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField id="term-sequence" label="Sequence" required error={errors.sequence?.message}>
            <Input
              id="term-sequence"
              inputMode="numeric"
              disabled={busy}
              {...register('sequence')}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="term-starts" label="Starts on" required error={errors.startsOn?.message}>
              <Input id="term-starts" type="date" disabled={busy} {...register('startsOn')} />
            </FormField>
            <FormField id="term-ends" label="Ends on" required error={errors.endsOn?.message}>
              <Input id="term-ends" type="date" disabled={busy} {...register('endsOn')} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save term' : 'Add term'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          {termsQuery.isLoading ? <LoadingState message="Loading terms…" /> : null}
          {termsQuery.isError ? (
            <ErrorState
              message={getErrorMessage(termsQuery.error, 'Unable to load terms.')}
              onRetry={() => void termsQuery.refetch()}
            />
          ) : null}
          {termsQuery.isSuccess && terms.length === 0 ? (
            <EmptyState title="No terms yet" description="Add the first term for this year." />
          ) : null}
          {terms.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40">
              {terms.map((term) => (
                <li
                  key={term.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-sans text-body-md text-primary">
                      {term.sequence}. {term.name}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {formatDateOnly(term.startsOn)} – {formatDateOnly(term.endsOn)}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="md" onClick={() => startEdit(term)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Terms are removed automatically when their academic year is deleted; the backend has no
            separate term delete.
          </p>
        </div>
      </div>
    </section>
  );
}
