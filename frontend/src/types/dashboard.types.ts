/** Matches backend `dashboard.service` response payloads. */

export interface DashboardOverview {
  pages: {
    published: number;
    draft: number;
  };
  blogPosts: {
    published: number;
    draft: number;
  };
  contactMessages: {
    total: number;
    new: number;
  };
  newsletterSubscribers: {
    total: number;
    active: number;
    pending: number;
  };
  admissionInquiries: {
    total: number;
    new: number;
  };
  events: {
    upcomingPublished: number;
  };
  mediaAssets: {
    total: number;
  };
}

export interface DashboardActivityAdmin {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export type DashboardActivityMetadata = Record<string, string | number | boolean | string[]> | null;

export interface DashboardActivityItem {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: DashboardActivityMetadata;
  createdAt: string;
  admin: DashboardActivityAdmin | null;
}

export interface DashboardRecentActivityData {
  items: DashboardActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContentStatusGroup {
  byStatus: Record<string, number>;
  total: number;
}

export interface DashboardContentStatistics {
  pages: ContentStatusGroup;
  blogPosts: ContentStatusGroup;
  blogCategories: {
    total: number;
  };
  events: ContentStatusGroup;
}

export interface InquiryStatusGroup {
  total: number;
  byStatus: Record<string, number>;
}

export interface DashboardInquiryStatistics {
  filters: {
    from: string | null;
    to: string | null;
  };
  contactMessages: InquiryStatusGroup;
  admissionInquiries: InquiryStatusGroup;
}

export interface RecentActivityQuery {
  page?: number;
  limit?: number;
}

export interface InquiryStatisticsQuery {
  from?: string;
  to?: string;
}
