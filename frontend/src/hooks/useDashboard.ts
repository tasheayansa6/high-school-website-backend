import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchDashboardContentStatistics,
  fetchDashboardInquiryStatistics,
  fetchDashboardOverview,
  fetchDashboardRecentActivity,
} from '@/services/dashboard/dashboardService';
import type { InquiryStatisticsQuery, RecentActivityQuery } from '@/types/dashboard.types';

const DASHBOARD_STALE_MS = 30_000;

export function useDashboardOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: ({ signal }) => fetchDashboardOverview({ signal }),
    select: (response) => response.data.overview,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useDashboardRecentActivity(query: RecentActivityQuery = { page: 1, limit: 12 }) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivity(query),
    queryFn: ({ signal }) => fetchDashboardRecentActivity(query, { signal }),
    select: (response) => response.data,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useDashboardContentStatistics() {
  return useQuery({
    queryKey: queryKeys.dashboard.contentStatistics,
    queryFn: ({ signal }) => fetchDashboardContentStatistics({ signal }),
    select: (response) => response.data.statistics,
    staleTime: DASHBOARD_STALE_MS,
  });
}

export function useDashboardInquiryStatistics(query: InquiryStatisticsQuery = {}) {
  return useQuery({
    queryKey: queryKeys.dashboard.inquiryStatistics(query),
    queryFn: ({ signal }) => fetchDashboardInquiryStatistics(query, { signal }),
    select: (response) => response.data.statistics,
    staleTime: DASHBOARD_STALE_MS,
  });
}
