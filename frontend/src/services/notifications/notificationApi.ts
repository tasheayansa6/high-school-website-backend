import type { ApiRequestConfig } from '@/services/api/apiClient';
import { api } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  NotificationItem,
  NotificationListData,
  NotificationListQuery,
  UnreadCountData,
} from '@/types/notification.types';

type NotificationClient = typeof api;

function createNotificationApi(client: NotificationClient, base: string) {
  return {
    list(query: NotificationListQuery = {}, config?: ApiRequestConfig) {
      return client.get<NotificationListData>(base, { ...config, params: query });
    },
    unreadCount(config?: ApiRequestConfig) {
      return client.get<UnreadCountData>(`${base}/unread-count`, config);
    },
    getOne(id: number, config?: ApiRequestConfig) {
      return client.get<{ notification: NotificationItem }>(`${base}/${id}`, config);
    },
    markRead(id: number, config?: ApiRequestConfig) {
      return client.post<{ notification: NotificationItem }>(
        `${base}/${id}/read`,
        undefined,
        config,
      );
    },
    markAllRead(config?: ApiRequestConfig) {
      return client.post<{ updated: number }>(`${base}/read-all`, undefined, config);
    },
    archive(id: number, config?: ApiRequestConfig) {
      return client.post<{ notification: NotificationItem }>(
        `${base}/${id}/archive`,
        undefined,
        config,
      );
    },
    remove(id: number, config?: ApiRequestConfig) {
      return client.delete<{ notification: NotificationItem }>(`${base}/${id}`, config);
    },
  };
}

export const adminNotificationsApi = createNotificationApi(api, endpoints.admin.notifications);
export const teacherNotificationsApi = createNotificationApi(
  teacherApi,
  endpoints.teacher.notifications,
);
export const studentNotificationsApi = createNotificationApi(
  studentApi,
  endpoints.student.notifications,
);

export type NotificationPortal = 'admin' | 'teacher' | 'student';

export function getNotificationApi(portal: NotificationPortal) {
  if (portal === 'admin') return adminNotificationsApi;
  if (portal === 'teacher') return teacherNotificationsApi;
  return studentNotificationsApi;
}
