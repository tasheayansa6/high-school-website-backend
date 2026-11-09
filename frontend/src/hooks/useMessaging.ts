import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { getMessagingApi, type MessagingPortal } from '@/services/messaging/messagingApi';
import type {
  ConversationListQuery,
  MessageListQuery,
  MessagingActorType,
} from '@/types/messaging.types';

const STALE_MS = 10_000;
const UNREAD_REFETCH_MS = 30_000;

function keys(portal: MessagingPortal) {
  return queryKeys.messaging[portal];
}

export function useMessagingUnread(portal: MessagingPortal, enabled = true) {
  const api = getMessagingApi(portal);
  return useQuery({
    queryKey: keys(portal).unread,
    queryFn: ({ signal }) => api.unreadCount({ signal }),
    select: (response) => response.data.unreadCount,
    staleTime: STALE_MS,
    refetchInterval: UNREAD_REFETCH_MS,
    enabled,
  });
}

export function useConversations(
  portal: MessagingPortal,
  query: ConversationListQuery = {},
  enabled = true,
) {
  const api = getMessagingApi(portal);
  return useQuery({
    queryKey: keys(portal).list({ ...query }),
    queryFn: ({ signal }) => api.listConversations(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
    refetchInterval: UNREAD_REFETCH_MS,
    enabled,
  });
}

export function useMessagingContacts(portal: MessagingPortal, q = '', enabled = true) {
  const api = getMessagingApi(portal);
  return useQuery({
    queryKey: keys(portal).contacts({ q }),
    queryFn: ({ signal }) => api.contacts({ q }, { signal }),
    select: (response) => response.data.items,
    staleTime: STALE_MS,
    enabled,
  });
}

export function useConversationMessages(
  portal: MessagingPortal,
  conversationId: number | null,
  query: MessageListQuery = {},
) {
  const api = getMessagingApi(portal);
  return useQuery({
    queryKey: keys(portal).messages(conversationId ?? 0, { ...query }),
    queryFn: ({ signal }) => api.listMessages(conversationId!, query, { signal }),
    select: (response) => response.data,
    staleTime: 5_000,
    refetchInterval: conversationId ? 15_000 : false,
    enabled: Boolean(conversationId),
  });
}

export function useMessagingActions(portal: MessagingPortal) {
  const api = getMessagingApi(portal);
  const queryClient = useQueryClient();
  const k = keys(portal);

  async function invalidateAll(conversationId?: number) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: k.all }),
      queryClient.invalidateQueries({ queryKey: k.unread }),
      conversationId
        ? queryClient.invalidateQueries({ queryKey: k.messages(conversationId, {}) })
        : Promise.resolve(),
    ]);
  }

  const start = useMutation({
    mutationFn: (body: { peerType: MessagingActorType; peerId: number }) => api.start(body),
    onSuccess: () => void invalidateAll(),
  });

  const send = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => api.send(id, { body }),
    onSuccess: (_data, vars) => void invalidateAll(vars.id),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.markRead(id),
    onSuccess: (_data, id) => void invalidateAll(id),
  });

  return { start, send, markRead, invalidateAll };
}
