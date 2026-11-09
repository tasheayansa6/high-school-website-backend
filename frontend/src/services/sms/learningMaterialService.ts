import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  LearningMaterial,
  LearningMaterialList,
  LearningMaterialListQuery,
  LearningMaterialStats,
} from '@/types/learningMaterial.types';

const e = endpoints.admin.sms.learningMaterials;

export function listAdminLearningMaterials(
  query: LearningMaterialListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<LearningMaterialList>(e.list, { ...config, params: query });
}

export function getAdminLearningMaterialStats(
  query: LearningMaterialListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<LearningMaterialStats>(e.stats, { ...config, params: query });
}

export function getAdminLearningMaterial(id: number, config?: ApiRequestConfig) {
  return api.get<{ material: LearningMaterial }>(e.detail(id), config);
}

export function publishAdminLearningMaterial(id: number, config?: ApiRequestConfig) {
  return api.post<{ material: LearningMaterial }>(e.publish(id), {}, config);
}

export function unpublishAdminLearningMaterial(id: number, config?: ApiRequestConfig) {
  return api.post<{ material: LearningMaterial }>(e.unpublish(id), {}, config);
}

export function archiveAdminLearningMaterial(id: number, config?: ApiRequestConfig) {
  return api.post<{ material: LearningMaterial }>(e.archive(id), {}, config);
}

export function deleteAdminLearningMaterial(id: number, config?: ApiRequestConfig) {
  return api.delete<{ material: LearningMaterial }>(e.detail(id), config);
}
