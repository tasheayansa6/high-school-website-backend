import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { CmsPage, PageListQuery, PaginatedList } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function listPages(query: PageListQuery = {}, config?: ApiRequestConfig) {
  const response = await api.get<PaginatedList<CmsPage>>(endpoints.pages.list, {
    ...config,
    params: query,
  });
  return response;
}

export async function getPageBySlug(slug: string, config?: ApiRequestConfig) {
  const response = await api.get<{ page: CmsPage }>(endpoints.pages.detail(slug), config);
  return response;
}
