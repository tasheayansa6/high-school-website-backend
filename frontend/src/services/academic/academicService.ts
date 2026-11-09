import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { PublicAcademicOverviewData } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function getPublicAcademicOverview(config?: ApiRequestConfig) {
  return api.get<PublicAcademicOverviewData>(endpoints.academic.overview, config);
}
