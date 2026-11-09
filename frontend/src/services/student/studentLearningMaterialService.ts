import type { ApiRequestConfig } from '@/services/api/apiClient';
import { studentApi } from '@/services/api/studentApiClient';
import type {
  LearningMaterialList,
  LearningMaterialListQuery,
} from '@/types/learningMaterial.types';

const LIST_PATH = '/student/learning-materials';

export function listStudentLearningMaterials(
  query: LearningMaterialListQuery = {},
  config?: ApiRequestConfig,
) {
  return studentApi.get<LearningMaterialList>(LIST_PATH, { ...config, params: query });
}
