import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AttendanceListQuery,
  AttendanceRecord,
  BulkAttendanceBody,
  BulkAttendanceResult,
  OpsPaginated,
} from '@/types/ops.types';

const e = endpoints.admin.sms.attendance;

export function listAttendance(query: AttendanceListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<AttendanceRecord>>(e.list, { ...config, params: query });
}

export function bulkMarkAttendance(body: BulkAttendanceBody, config?: ApiRequestConfig) {
  return api.post<BulkAttendanceResult>(e.bulk, body, config);
}

export function deleteAttendance(id: number, config?: ApiRequestConfig) {
  return api.delete<{ attendance: AttendanceRecord }>(e.detail(id), config);
}
