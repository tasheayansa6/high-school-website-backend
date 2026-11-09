export type NotificationCategory =
  | 'ACADEMIC'
  | 'ATTENDANCE'
  | 'TIMETABLE'
  | 'LEARNING_MATERIAL'
  | 'ANNOUNCEMENT'
  | 'ADMINISTRATION'
  | 'MESSAGING';

export type NotificationRecipientType = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface NotificationItem {
  id: number;
  recipientType: NotificationRecipientType;
  adminId: number | null;
  teacherId: number | null;
  studentId: number | null;
  title: string;
  message: string;
  category: NotificationCategory;
  dedupeKey: string;
  entityType: string | null;
  entityId: string | null;
  actionPath: string | null;
  isRead: boolean;
  readAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
  isRead?: boolean;
  includeArchived?: boolean;
  from?: string;
  to?: string;
}

export interface NotificationListData {
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountData {
  unreadCount: number;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  ACADEMIC: 'Academic',
  ATTENDANCE: 'Attendance',
  TIMETABLE: 'Timetable',
  LEARNING_MATERIAL: 'Materials',
  ANNOUNCEMENT: 'Announcement',
  ADMINISTRATION: 'Administration',
  MESSAGING: 'Messaging',
};

export const NOTIFICATION_CATEGORIES = Object.keys(
  NOTIFICATION_CATEGORY_LABELS,
) as NotificationCategory[];
