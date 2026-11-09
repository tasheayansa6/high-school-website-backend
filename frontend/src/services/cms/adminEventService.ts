import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AdminEvent,
  AdminEventListQuery,
  CreateEventBody,
  PaginatedResult,
  UpdateEventBody,
} from '@/types/cms.types';

export async function listAdminEvents(query: AdminEventListQuery = {}, config?: ApiRequestConfig) {
  return api.get<PaginatedResult<AdminEvent>>(endpoints.admin.events.list, {
    ...config,
    params: query,
  });
}

export async function getAdminEvent(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ event: AdminEvent }>(endpoints.admin.events.detail(id), {
    ...config,
    params: options,
  });
}

export async function createAdminEvent(body: CreateEventBody, config?: ApiRequestConfig) {
  return api.post<{ event: AdminEvent }>(endpoints.admin.events.create, body, config);
}

export async function updateAdminEvent(
  id: number,
  body: UpdateEventBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ event: AdminEvent }>(endpoints.admin.events.detail(id), body, config);
}

export async function publishAdminEvent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ event: AdminEvent }>(endpoints.admin.events.publish(id), undefined, config);
}

export async function unpublishAdminEvent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ event: AdminEvent }>(endpoints.admin.events.unpublish(id), undefined, config);
}

export async function cancelAdminEvent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ event: AdminEvent }>(endpoints.admin.events.cancel(id), undefined, config);
}

export async function deleteAdminEvent(id: number, config?: ApiRequestConfig) {
  return api.delete<{ event: AdminEvent }>(endpoints.admin.events.detail(id), config);
}

export async function restoreAdminEvent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ event: AdminEvent }>(endpoints.admin.events.restore(id), undefined, config);
}
