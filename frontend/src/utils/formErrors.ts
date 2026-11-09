import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

import { ApiClientError, toApiClientError } from '@/services/api/apiError';

/** Map backend validation `errors[].field` onto React Hook Form field errors. */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): boolean {
  const apiError = error instanceof ApiClientError ? error : toApiClientError(error);
  if (!apiError.errors.length) {
    return false;
  }

  let applied = false;
  for (const detail of apiError.errors) {
    const field = detail.field ?? detail.path;
    if (!field) {
      continue;
    }
    setError(field as FieldPath<TFieldValues>, {
      type: 'server',
      message: detail.message,
    });
    applied = true;
  }
  return applied;
}
