import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/lib/env';
import { ApiClientError, toApiClientError } from '@/services/api/apiError';
import type { ApiSuccessResponse } from '@/services/api/apiTypes';
import { emitAuthUnauthorized } from '@/services/api/authEvents';
import { clearAccessToken, getAccessToken } from '@/services/api/authToken';
import { endpoints } from '@/services/api/endpoints';

const DEFAULT_TIMEOUT_MS = 15_000;

function isAdminLoginRequest(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const url = error.config?.url ?? '';
  return url.includes(endpoints.admin.auth.login);
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiClientError(error);
    if (apiError.isUnauthorized) {
      const skipSessionClearNotify = isAdminLoginRequest(error);
      clearAccessToken();
      if (!skipSessionClearNotify) {
        emitAuthUnauthorized();
      }
    }
    return Promise.reject(apiError);
  },
);

export function assertSuccessEnvelope<T>(payload: unknown): ApiSuccessResponse<T> {
  if (!payload || typeof payload !== 'object') {
    throw new ApiClientError({
      message: 'Malformed API response',
      code: 'MALFORMED_RESPONSE',
    });
  }

  const record = payload as Record<string, unknown>;
  if (record.success !== true || typeof record.message !== 'string') {
    throw new ApiClientError({
      message:
        typeof record.message === 'string' ? record.message : 'Unexpected API response shape',
      code: typeof record.code === 'string' ? record.code : 'UNEXPECTED_RESPONSE',
      data: record.data,
    });
  }

  return payload as ApiSuccessResponse<T>;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  /** Optional AbortSignal for TanStack Query / manual cancellation. */
  signal?: AbortSignal;
}

/** Build the typed request helpers (`get`/`post`/…) for a given Axios instance. */
export function createApi(client: AxiosInstance) {
  async function request<T>(config: ApiRequestConfig): Promise<ApiSuccessResponse<T>> {
    try {
      const response: AxiosResponse<unknown> = await client.request(config);
      return assertSuccessEnvelope<T>(response.data);
    } catch (error) {
      throw toApiClientError(error);
    }
  }

  return {
    get<T>(url: string, config?: ApiRequestConfig) {
      return request<T>({ ...config, method: 'GET', url });
    },
    post<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
      return request<T>({ ...config, method: 'POST', url, data });
    },
    /** Multipart upload — clears JSON Content-Type so the runtime sets the FormData boundary. */
    postFormData<T>(url: string, data: FormData, config?: ApiRequestConfig) {
      return request<T>({
        ...config,
        method: 'POST',
        url,
        data,
        transformRequest: [
          (body, headers) => {
            if (headers && typeof headers.set === 'function') {
              headers.set('Content-Type', false);
            }
            return body as FormData;
          },
        ],
      });
    },
    put<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
      return request<T>({ ...config, method: 'PUT', url, data });
    },
    patch<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
      return request<T>({ ...config, method: 'PATCH', url, data });
    },
    delete<T>(url: string, config?: ApiRequestConfig) {
      return request<T>({ ...config, method: 'DELETE', url });
    },
  };
}

export const api = createApi(apiClient);
