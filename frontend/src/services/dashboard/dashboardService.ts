import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  DashboardContentStatistics,
  DashboardInquiryStatistics,
  DashboardOverview,
  DashboardRecentActivityData,
  InquiryStatisticsQuery,
  RecentActivityQuery,
} from '@/types/dashboard.types';

export async function fetchDashboardOverview(config?: ApiRequestConfig) {
  return api.get<{ overview: DashboardOverview }>(endpoints.admin.dashboard.overview, config);
}

export async function fetchDashboardRecentActivity(
  query: RecentActivityQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<DashboardRecentActivityData>(endpoints.admin.dashboard.recentActivity, {
    ...config,
    params: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    },
  });
}

export async function fetchDashboardContentStatistics(config?: ApiRequestConfig) {
  return api.get<{ statistics: DashboardContentStatistics }>(
    endpoints.admin.dashboard.contentStatistics,
    config,
  );
}

export async function fetchDashboardInquiryStatistics(
  query: InquiryStatisticsQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ statistics: DashboardInquiryStatistics }>(
    endpoints.admin.dashboard.inquiryStatistics,
    {
      ...config,
      params: {
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      },
    },
  );
}
