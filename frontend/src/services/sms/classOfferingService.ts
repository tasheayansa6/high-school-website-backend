import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  ClassOfferingListQuery,
  CreateClassOfferingBody,
  SmsClassOffering,
  SmsPaginatedResult,
  UpdateClassOfferingBody,
} from '@/types/sms.types';

const e = endpoints.admin.sms.classOfferings;

export function listClassOfferings(query: ClassOfferingListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsClassOffering>>(e.list, { ...config, params: query });
}

export function createClassOffering(body: CreateClassOfferingBody, config?: ApiRequestConfig) {
  return api.post<{ classOffering: SmsClassOffering }>(e.list, body, config);
}

export function updateClassOffering(
  id: number,
  body: UpdateClassOfferingBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ classOffering: SmsClassOffering }>(e.detail(id), body, config);
}

export function deleteClassOffering(id: number, config?: ApiRequestConfig) {
  return api.delete<{ classOffering: SmsClassOffering }>(e.detail(id), config);
}
