import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  Announcement,
  AnnouncementListQuery,
  CreateAnnouncementBody,
  OpsPaginated,
  UpdateAnnouncementBody,
} from '@/types/ops.types';

const e = endpoints.admin.sms.announcements;

export function listAnnouncements(query: AnnouncementListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<Announcement>>(e.list, { ...config, params: query });
}

export function createAnnouncement(body: CreateAnnouncementBody, config?: ApiRequestConfig) {
  return api.post<{ announcement: Announcement }>(e.list, body, config);
}

export function updateAnnouncement(
  id: number,
  body: UpdateAnnouncementBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ announcement: Announcement }>(e.detail(id), body, config);
}

export function publishAnnouncement(id: number, config?: ApiRequestConfig) {
  return api.post<{ announcement: Announcement }>(e.publish(id), undefined, config);
}

export function deleteAnnouncement(id: number, config?: ApiRequestConfig) {
  return api.delete<{ announcement: Announcement }>(e.detail(id), config);
}
