import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  getNotificationApi,
  type NotificationPortal,
} from '@/services/notifications/notificationApi';
import type { NotificationListQuery } from '@/types/notification.types';

const LIST_STALE_MS = 15_000;
const UNREAD_STALE_MS = 20_000;
/** Light refresh for the header badge — not claimed as push/realtime. */
const UNREAD_REFETCH_MS = 60_000;

function portalKeys(portal: NotificationPortal) {
  return queryKeys.notifications[portal];
}

export function useNotificationUnreadCount(portal: NotificationPortal, enabled = true) {
  const api = getNotificationApi(portal);
  return useQuery({
    queryKey: portalKeys(portal).unread,
    queryFn: ({ signal }) => api.unreadCount({ signal }),
    select: (response) => response.data.unreadCount,
    staleTime: UNREAD_STALE_MS,
    refetchInterval: UNREAD_REFETCH_MS,
    enabled,
  });
}

export function useNotificationList(
  portal: NotificationPortal,
  query: NotificationListQuery,
  enabled = true,
) {
  const api = getNotificationApi(portal);
  return useQuery({
    queryKey: portalKeys(portal).list({ ...query }),
    queryFn: ({ signal }) => api.list(query, { signal }),
    select: (response) => response.data,
    staleTime: LIST_STALE_MS,
    enabled,
  });
}

export function useNotificationActions(portal: NotificationPortal) {
  const api = getNotificationApi(portal);
  const queryClient = useQueryClient();
  const keys = portalKeys(portal);

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.all }),
      queryClient.invalidateQueries({ queryKey: keys.unread }),
    ]);
  }

  const markRead = useMutation({
    mutationFn: (id: number) => api.markRead(id),
    onSuccess: () => void invalidateAll(),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.markAllRead(),
    onSuccess: () => void invalidateAll(),
  });

  const archive = useMutation({
    mutationFn: (id: number) => api.archive(id),
    onSuccess: () => void invalidateAll(),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => void invalidateAll(),
  });

  return { markRead, markAllRead, archive, remove, invalidateAll };
}
