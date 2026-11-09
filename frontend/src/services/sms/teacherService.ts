import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CreateTeacherBody,
  SmsPaginatedResult,
  SmsTeacher,
  TeacherListQuery,
  UpdateTeacherBody,
} from '@/types/sms.types';

const e = endpoints.admin.sms.teachers;

export function listTeachers(query: TeacherListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsTeacher>>(e.list, { ...config, params: query });
}

export function getTeacher(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ teacher: SmsTeacher }>(e.detail(id), { ...config, params: options });
}

export function createTeacher(body: CreateTeacherBody, config?: ApiRequestConfig) {
  return api.post<{ teacher: SmsTeacher }>(e.list, body, config);
}

export function updateTeacher(id: number, body: UpdateTeacherBody, config?: ApiRequestConfig) {
  return api.patch<{ teacher: SmsTeacher }>(e.detail(id), body, config);
}

export function activateTeacher(id: number, config?: ApiRequestConfig) {
  return api.patch<{ teacher: SmsTeacher }>(e.activate(id), undefined, config);
}

export function deactivateTeacher(id: number, config?: ApiRequestConfig) {
  return api.patch<{ teacher: SmsTeacher }>(e.deactivate(id), undefined, config);
}

export function deleteTeacher(id: number, config?: ApiRequestConfig) {
  return api.delete<{ teacher: SmsTeacher }>(e.detail(id), config);
}

export function restoreTeacher(id: number, config?: ApiRequestConfig) {
  return api.patch<{ teacher: SmsTeacher }>(e.restore(id), undefined, config);
}
