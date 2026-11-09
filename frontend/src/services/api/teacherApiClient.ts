import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';
import { createApi } from '@/services/api/apiClient';
import { toApiClientError } from '@/services/api/apiError';
import { endpoints } from '@/services/api/endpoints';
import { emitTeacherUnauthorized } from '@/services/api/teacherAuthEvents';
import { clearTeacherAccessToken, getTeacherAccessToken } from '@/services/api/teacherAuthToken';

const DEFAULT_TIMEOUT_MS = 15_000;

function isTeacherLoginRequest(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  return (error.config?.url ?? '').includes(endpoints.teacher.auth.login);
}

/**
 * Axios instance dedicated to teacher routes. It only ever attaches the teacher
 * token, and a 401 only clears teacher session state — never the admin session.
 */
export const teacherApiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

teacherApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getTeacherAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

teacherApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiClientError(error);
    if (apiError.isUnauthorized) {
      const isLogin = isTeacherLoginRequest(error);
      clearTeacherAccessToken();
      if (!isLogin) {
        emitTeacherUnauthorized();
      }
    }
    return Promise.reject(apiError);
  },
);

export const teacherApi = createApi(teacherApiClient);
