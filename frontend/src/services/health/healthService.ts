import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { HealthData } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function getHealth(config?: ApiRequestConfig) {
  const response = await api.get<HealthData>(endpoints.health, config);
  return response;
}
