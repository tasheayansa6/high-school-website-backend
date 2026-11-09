import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
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
  createFeeStructure,
  deleteFeeStructure,
  listFeeStructures,
  updateFeeStructure,
} from '@/services/sms/feeService';
import type { FeeStructure } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatMoney } from '@/utils/opsFormat';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500),
  amount: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) > 0, 'Amount must be greater than 0'),
  currency: z.string().trim().max(10),
  isActive: z.boolean(),
});

type FormValues = z.input<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  description: '',
  amount: '',
  currency: 'ETB',
  isActive: true,
};

const PAGE_SIZE = 20;

export function FeeStructuresSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeeStructure | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const query = { page, limit: PAGE_SIZE };
  const listQuery = useQuery({
    queryKey: queryKeys.sms.feeStructures.list({ ...query }),
    queryFn: ({ signal }) => listFeeStructures(query, { signal }),
    select: (response) => response.data,
  });
  const items = listQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sms.feeStructures.all });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const parsed = schema.parse(values);
      const description = parsed.description.trim();
      const currency = parsed.currency.trim();
      if (editing) {
        return updateFeeStructure(editing.id, {
          name: parsed.name,
          description: description || null,
          amount: Number(parsed.amount),
          ...(currency ? { currency } : {}),
          isActive: parsed.isActive,
        });
      }
      return createFeeStructure({
        name: parsed.name,
        ...(description ? { description } : {}),
        amount: Number(parsed.amount),
        ...(currency ? { currency } : {}),
        isActive: parsed.isActive,
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setEditing(null);
      reset(EMPTY_VALUES);
      await invalidate();
    },
    onError: (error) => {
      setActionSuccess(null);
      if (!applyApiFieldErrors(error, setError)) {
        setActionError(getErrorMessage(error, 'Unable to save the fee structure.'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeeStructure(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      if (editing?.id === response.data.feeStructure.id) {
        setEditing(null);
        reset(EMPTY_VALUES);
      }
      await invalidate();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete the fee structure.'));
    },
  });

  function startEdit(item: FeeStructure) {
    setEditing(item);
    setActionSuccess(null);
    reset({
      name: item.name,
      description: item.description ?? '',
      amount: String(item.amount),
      currency: item.currency,
      isActive: item.isActive,
    });
  }

  const busy = isSubmitting || saveMutation.isPending;

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
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? 'Edit fee structure' : 'New fee structure'}
          </h2>
          <FormField id="fee-name" label="Name" required error={errors.name?.message}>
            <Input
              id="fee-name"
              disabled={busy}
              hasError={Boolean(errors.name)}
              {...register('name')}
            />
          </FormField>
          <FormField id="fee-description" label="Description" error={errors.description?.message}>
            <Input id="fee-description" disabled={busy} {...register('description')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="fee-amount" label="Amount" required error={errors.amount?.message}>
              <Input
                id="fee-amount"
                type="number"
                min={0}
                step="0.01"
                disabled={busy}
                hasError={Boolean(errors.amount)}
                {...register('amount')}
              />
            </FormField>
            <FormField id="fee-currency" label="Currency" error={errors.currency?.message}>
              <Input id="fee-currency" disabled={busy} {...register('currency')} />
            </FormField>
          </div>
          <Checkbox id="fee-active" label="Active" disabled={busy} {...register('isActive')} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save changes' : 'Create fee structure'}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  reset(EMPTY_VALUES);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="lg:col-span-3">
          {listQuery.isLoading ? <LoadingState message="Loading fee structures…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load fee structures.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState title="No fee structures" description="Create the first fee structure." />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                >
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-body-md text-primary">
                      {item.name}
                      <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {formatMoney(item.amount, item.currency)}
                      {item.description ? ` · ${item.description}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="md" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
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
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this fee structure?"
        description={pendingDelete ? `"${pendingDelete.name}" will be removed.` : ''}
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
