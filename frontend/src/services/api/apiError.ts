import axios from 'axios';

import type { ApiErrorDetail, ApiErrorResponse } from '@/services/api/apiTypes';

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly errors: ApiErrorDetail[];
  readonly data: unknown;
  readonly isNetworkError: boolean;
  readonly isCanceled: boolean;

  constructor(options: {
    message: string;
    status?: number | null;
    code?: string | null;
    errors?: ApiErrorDetail[];
    data?: unknown;
    isNetworkError?: boolean;
    isCanceled?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.errors = options.errors ?? [];
    this.data = options.data;
    this.isNetworkError = options.isNetworkError === true;
    this.isCanceled = options.isCanceled === true;
  }

  get isClientError(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }
}

function readEnvelope(payload: unknown): ApiErrorResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.success !== false || typeof record.message !== 'string') {
    return null;
  }
  return payload as ApiErrorResponse;
}

/** Normalize Axios / network failures into `ApiClientError`. */
export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')) {
    return new ApiClientError({
      message: 'Request was canceled',
      code: 'REQUEST_CANCELED',
      isCanceled: true,
    });
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiClientError({
        message: error.message || 'Network request failed',
        code: error.code ?? 'NETWORK_ERROR',
        isNetworkError: true,
      });
    }

    const envelope = readEnvelope(error.response.data);
    return new ApiClientError({
      message: envelope?.message ?? error.message ?? 'Request failed',
      status: error.response.status,
      code: envelope?.code ?? `HTTP_${error.response.status}`,
      errors: envelope?.errors ?? [],
      data: envelope?.data,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({ message: error.message, code: 'UNKNOWN_ERROR' });
  }

  return new ApiClientError({ message: 'Unknown API error', code: 'UNKNOWN_ERROR' });
}

/** Whether TanStack Query should retry this failure. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const apiError = toApiClientError(error);
  if (apiError.isCanceled) {
    return false;
  }
  if (apiError.isValidationError || apiError.isUnauthorized || apiError.isForbidden) {
    return false;
  }
  if (apiError.status !== null && apiError.status >= 400 && apiError.status < 500) {
    return false;
  }
  return failureCount < 2;
}
