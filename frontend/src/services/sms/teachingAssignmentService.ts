import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CreateTeachingAssignmentBody,
  SmsPaginatedResult,
  SmsTeachingAssignment,
  TeachingAssignmentListQuery,
} from '@/types/sms.types';

const e = endpoints.admin.sms.teachingAssignments;

export function listTeachingAssignments(
  query: TeachingAssignmentListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<SmsPaginatedResult<SmsTeachingAssignment>>(e.list, {
    ...config,
    params: query,
  });
}

export function createTeachingAssignment(
  body: CreateTeachingAssignmentBody,
  config?: ApiRequestConfig,
) {
  return api.post<{ teachingAssignment: SmsTeachingAssignment }>(e.list, body, config);
}

export function deleteTeachingAssignment(id: number, config?: ApiRequestConfig) {
  return api.delete<{ teachingAssignment: SmsTeachingAssignment }>(e.detail(id), config);
}
