import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  CreateLearningMaterialFields,
  LearningMaterial,
  LearningMaterialList,
  LearningMaterialListQuery,
  UpdateLearningMaterialBody,
} from '@/types/learningMaterial.types';

const e = endpoints.teacher.learningMaterials;

export function listTeacherLearningMaterials(
  query: LearningMaterialListQuery = {},
  config?: ApiRequestConfig,
) {
  return teacherApi.get<LearningMaterialList>(e.list, { ...config, params: query });
}

export function createTeacherLearningMaterial(
  fields: CreateLearningMaterialFields,
  file: File,
  config?: ApiRequestConfig,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', fields.title);
  if (fields.description) formData.append('description', fields.description);
  if (fields.category) formData.append('category', fields.category);
  formData.append('academicYearId', String(fields.academicYearId));
  if (fields.academicTermId != null) {
    formData.append('academicTermId', String(fields.academicTermId));
  }
  formData.append('classOfferingId', String(fields.classOfferingId));
  formData.append('subjectId', String(fields.subjectId));
  formData.append('publish', fields.publish ? 'true' : 'false');
  return teacherApi.postFormData<{ material: LearningMaterial }>(e.list, formData, config);
}

export function updateTeacherLearningMaterial(
  id: number,
  body: UpdateLearningMaterialBody,
  config?: ApiRequestConfig,
) {
  return teacherApi.patch<{ material: LearningMaterial }>(e.detail(id), body, config);
}

export function publishTeacherLearningMaterial(id: number, config?: ApiRequestConfig) {
  return teacherApi.post<{ material: LearningMaterial }>(e.publish(id), {}, config);
}

export function unpublishTeacherLearningMaterial(id: number, config?: ApiRequestConfig) {
  return teacherApi.post<{ material: LearningMaterial }>(e.unpublish(id), {}, config);
}

export function deleteTeacherLearningMaterial(id: number, config?: ApiRequestConfig) {
  return teacherApi.delete<{ material: LearningMaterial }>(e.detail(id), config);
}
