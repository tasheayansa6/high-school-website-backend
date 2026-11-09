import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type { ReportOverview, ReportOverviewQuery } from '@/types/ops.types';

export function fetchReportOverview(query: ReportOverviewQuery = {}, config?: ApiRequestConfig) {
  return api.get<ReportOverview>(endpoints.admin.sms.reports.overview, {
    ...config,
    params: query,
  });
}
