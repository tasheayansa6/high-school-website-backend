import type { ApiRequestConfig } from '@/services/api/apiClient';
import { api } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  ConversationListQuery,
  ConversationSummary,
  MessageListQuery,
  MessagingActorType,
  MessagingContact,
  MessagingMessage,
} from '@/types/messaging.types';

type Client = typeof api;

function createMessagingApi(client: Client, base: string) {
  return {
    listConversations(query: ConversationListQuery = {}, config?: ApiRequestConfig) {
      return client.get<{
        items: ConversationSummary[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`${base}/conversations`, { ...config, params: query });
    },
    unreadCount(config?: ApiRequestConfig) {
      return client.get<{ unreadCount: number }>(`${base}/unread-count`, config);
    },
    contacts(query: { q?: string } = {}, config?: ApiRequestConfig) {
      return client.get<{ items: MessagingContact[] }>(`${base}/contacts`, {
        ...config,
        params: query,
      });
    },
    start(body: { peerType: MessagingActorType; peerId: number }, config?: ApiRequestConfig) {
      return client.post<{ conversation: ConversationSummary }>(
        `${base}/conversations`,
        body,
        config,
      );
    },
    getConversation(id: number, config?: ApiRequestConfig) {
      return client.get<{ conversation: ConversationSummary }>(
        `${base}/conversations/${id}`,
        config,
      );
    },
    listMessages(id: number, query: MessageListQuery = {}, config?: ApiRequestConfig) {
      return client.get<{
        items: MessagingMessage[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`${base}/conversations/${id}/messages`, { ...config, params: query });
    },
    send(id: number, body: { body: string }, config?: ApiRequestConfig) {
      return client.post<{ message: MessagingMessage }>(
        `${base}/conversations/${id}/messages`,
        body,
        config,
      );
    },
    markRead(id: number, config?: ApiRequestConfig) {
      return client.post<{ conversationId: number; lastReadAt: string }>(
        `${base}/conversations/${id}/read`,
        undefined,
        config,
      );
    },
  };
}

export type MessagingPortal = 'admin' | 'teacher' | 'student';

export const adminMessagingApi = createMessagingApi(api, endpoints.admin.messages);
export const teacherMessagingApi = createMessagingApi(teacherApi, endpoints.teacher.messages);
export const studentMessagingApi = createMessagingApi(studentApi, endpoints.student.messages);

export function getMessagingApi(portal: MessagingPortal) {
  if (portal === 'admin') return adminMessagingApi;
  if (portal === 'teacher') return teacherMessagingApi;
  return studentMessagingApi;
}
