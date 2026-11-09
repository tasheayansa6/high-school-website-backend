import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CreateEnrollmentBody,
  EnrollmentListQuery,
  SmsEnrollment,
  SmsPaginatedResult,
  UpdateEnrollmentStatusBody,
} from '@/types/sms.types';

const e = endpoints.admin.sms.enrollments;

export function listEnrollments(query: EnrollmentListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsEnrollment>>(e.list, { ...config, params: query });
}

export function createEnrollment(body: CreateEnrollmentBody, config?: ApiRequestConfig) {
  return api.post<{ enrollment: SmsEnrollment }>(e.list, body, config);
}

export function updateEnrollmentStatus(
  id: number,
  body: UpdateEnrollmentStatusBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ enrollment: SmsEnrollment }>(e.status(id), body, config);
}

export function deleteEnrollment(id: number, config?: ApiRequestConfig) {
  return api.delete<{ enrollment: SmsEnrollment }>(e.detail(id), config);
}
