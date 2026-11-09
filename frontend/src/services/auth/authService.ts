import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type { LoginCredentials, LoginResult, MeResult } from '@/services/auth/authTypes';

export async function loginAdmin(credentials: LoginCredentials, config?: ApiRequestConfig) {
  return api.post<LoginResult>(endpoints.admin.auth.login, credentials, config);
}

export async function fetchAdminProfile(config?: ApiRequestConfig) {
  return api.get<MeResult>(endpoints.admin.auth.me, config);
}

export async function logoutAdmin(config?: ApiRequestConfig) {
  return api.post<null>(endpoints.admin.auth.logout, undefined, config);
}
