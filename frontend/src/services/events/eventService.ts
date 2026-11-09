import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { EventListQuery, PaginatedList, SchoolEvent } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function listEvents(query: EventListQuery = {}, config?: ApiRequestConfig) {
  const response = await api.get<PaginatedList<SchoolEvent>>(endpoints.events.list, {
    ...config,
    params: query,
  });
  return response;
}

export async function getEventBySlug(slug: string, config?: ApiRequestConfig) {
  const response = await api.get<{ event: SchoolEvent }>(endpoints.events.detail(slug), config);
  return response;
}
