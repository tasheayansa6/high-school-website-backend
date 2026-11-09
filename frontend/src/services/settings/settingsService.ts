import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { PublicSettingsData } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function getPublicSettings(config?: ApiRequestConfig) {
  const response = await api.get<PublicSettingsData>(endpoints.settings.public, config);
  return response;
}
