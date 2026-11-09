import { ApiClientError, toApiClientError } from '@/services/api/apiError';

/** Prefer the backend message for UI errors. */
export function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error instanceof ApiClientError ? error : toApiClientError(error);
  if (apiError.isCanceled) {
    return fallback;
  }
  return apiError.message || fallback;
}
