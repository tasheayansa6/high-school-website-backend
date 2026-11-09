import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AdminPage,
  AdminPageListQuery,
  CreatePageBody,
  PaginatedResult,
  UpdatePageBody,
} from '@/types/cms.types';

export async function listAdminPages(query: AdminPageListQuery = {}, config?: ApiRequestConfig) {
  return api.get<PaginatedResult<AdminPage>>(endpoints.admin.pages.list, {
    ...config,
    params: query,
  });
}

export async function getAdminPage(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ page: AdminPage }>(endpoints.admin.pages.detail(id), {
    ...config,
    params: options,
  });
}

export async function createAdminPage(body: CreatePageBody, config?: ApiRequestConfig) {
  return api.post<{ page: AdminPage }>(endpoints.admin.pages.create, body, config);
}

export async function updateAdminPage(id: number, body: UpdatePageBody, config?: ApiRequestConfig) {
  return api.patch<{ page: AdminPage }>(endpoints.admin.pages.detail(id), body, config);
}

export async function publishAdminPage(id: number, config?: ApiRequestConfig) {
  return api.patch<{ page: AdminPage }>(endpoints.admin.pages.publish(id), undefined, config);
}

export async function unpublishAdminPage(id: number, config?: ApiRequestConfig) {
  return api.patch<{ page: AdminPage }>(endpoints.admin.pages.unpublish(id), undefined, config);
}

export async function deleteAdminPage(id: number, config?: ApiRequestConfig) {
  return api.delete<{ page: AdminPage }>(endpoints.admin.pages.detail(id), config);
}

export async function restoreAdminPage(id: number, config?: ApiRequestConfig) {
  return api.patch<{ page: AdminPage }>(endpoints.admin.pages.restore(id), undefined, config);
}
