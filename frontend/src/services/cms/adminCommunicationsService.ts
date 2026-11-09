import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';

export interface InboxListQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface NewsletterSubscriberRow {
  id: number;
  email: string;
  status: string;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface AdmissionInquiryRow {
  id: number;
  studentName: string;
  email: string;
  gradeApplyingFor: string;
  academicYear: string;
  status: string;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listContactMessages(query: InboxListQuery = {}, config?: ApiRequestConfig) {
  return api.get<Paginated<ContactMessageRow>>(endpoints.admin.contactMessages.list, {
    ...config,
    params: query,
  });
}

export async function listNewsletterSubscribers(
  query: InboxListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<Paginated<NewsletterSubscriberRow>>(endpoints.admin.newsletter.subscribers, {
    ...config,
    params: query,
  });
}

export async function listAdmissionInquiries(
  query: InboxListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<Paginated<AdmissionInquiryRow>>(endpoints.admin.admissions.inquiries, {
    ...config,
    params: query,
  });
}
