import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';
import { createApi } from '@/services/api/apiClient';
import { toApiClientError } from '@/services/api/apiError';
import { endpoints } from '@/services/api/endpoints';
import { emitStudentUnauthorized } from '@/services/api/studentAuthEvents';
import { clearStudentAccessToken, getStudentAccessToken } from '@/services/api/studentAuthToken';

const DEFAULT_TIMEOUT_MS = 15_000;

function isStudentLoginRequest(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  return (error.config?.url ?? '').includes(endpoints.student.auth.login);
}

/**
 * Axios instance dedicated to student routes. It only ever attaches the student
 * token, and a 401 only clears student session state — never the admin session.
 */
export const studentApiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

studentApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStudentAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

studentApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiClientError(error);
    if (apiError.isUnauthorized) {
      const isLogin = isStudentLoginRequest(error);
      clearStudentAccessToken();
      if (!isLogin) {
        emitStudentUnauthorized();
      }
    }
    return Promise.reject(apiError);
  },
);

export const studentApi = createApi(studentApiClient);
