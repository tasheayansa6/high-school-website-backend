import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CreateStudentBody,
  SmsPaginatedResult,
  SmsStudent,
  StudentListQuery,
  UpdateStudentBody,
} from '@/types/sms.types';

const e = endpoints.admin.sms.students;

export function listStudents(query: StudentListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsStudent>>(e.list, { ...config, params: query });
}

export function getStudent(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ student: SmsStudent }>(e.detail(id), { ...config, params: options });
}

export function createStudent(body: CreateStudentBody, config?: ApiRequestConfig) {
  return api.post<{ student: SmsStudent }>(e.list, body, config);
}

export function updateStudent(id: number, body: UpdateStudentBody, config?: ApiRequestConfig) {
  return api.patch<{ student: SmsStudent }>(e.detail(id), body, config);
}

export function activateStudent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ student: SmsStudent }>(e.activate(id), undefined, config);
}

export function deactivateStudent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ student: SmsStudent }>(e.deactivate(id), undefined, config);
}

export function deleteStudent(id: number, config?: ApiRequestConfig) {
  return api.delete<{ student: SmsStudent }>(e.detail(id), config);
}

export function restoreStudent(id: number, config?: ApiRequestConfig) {
  return api.patch<{ student: SmsStudent }>(e.restore(id), undefined, config);
}
