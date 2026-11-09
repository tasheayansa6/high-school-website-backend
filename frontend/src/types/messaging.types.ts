export type MessagingActorType = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface MessagingPerson {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  employeeCode?: string | null;
  studentCode?: string | null;
}

export interface MessagingParticipant {
  id: number;
  participantType: MessagingActorType;
  adminId: number | null;
  teacherId: number | null;
  studentId: number | null;
  lastReadAt: string | null;
  person: MessagingPerson | null;
}

export interface MessagingMessage {
  id: number;
  conversationId: number;
  senderType: MessagingActorType;
  adminId: number | null;
  teacherId: number | null;
  studentId: number | null;
  body: string;
  createdAt: string;
  sender: MessagingPerson | null;
}

export interface ConversationSummary {
  id: number;
  pairKey: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  otherParticipant: MessagingParticipant | null;
  lastMessage: MessagingMessage | null;
}

export interface MessagingContact extends MessagingPerson {
  type: MessagingActorType;
}

export interface ConversationListQuery {
  page?: number;
  limit?: number;
}

export interface MessageListQuery {
  page?: number;
  limit?: number;
}
