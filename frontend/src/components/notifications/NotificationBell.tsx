import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  useNotificationActions,
  useNotificationList,
  useNotificationUnreadCount,
} from '@/hooks/useNotifications';
import type { NotificationPortal } from '@/services/notifications/notificationApi';
import { NOTIFICATION_CATEGORY_LABELS, type NotificationItem } from '@/types/notification.types';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/relativeTime';

interface NotificationBellProps {
  portal: NotificationPortal;
  notificationsPath: string;
}

export function NotificationBell({ portal, notificationsPath }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unreadQuery = useNotificationUnreadCount(portal);
  const listQuery = useNotificationList(portal, { page: 1, limit: 8 }, open);
  const { markRead, markAllRead } = useNotificationActions(portal);
  const unread = unreadQuery.data ?? 0;
  const items = listQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openItem(item: NotificationItem) {
    if (!item.isRead) {
      await markRead.mutateAsync(item.id);
    }
    setOpen(false);
    if (item.actionPath) {
      void navigate(item.actionPath);
      return;
    }
    void navigate(notificationsPath);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center text-primary hover:bg-surface-container-low"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        data-testid={`${portal}-notification-bell`}
      >
        <MaterialIcon name="notifications" className="text-[22px]" />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-secondary px-1 font-label-caps text-[10px] text-on-secondary"
            data-testid={`${portal}-notification-badge`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] border border-outline-variant/40 bg-surface-container-lowest shadow-lg"
          data-testid={`${portal}-notification-panel`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant/30 px-4 py-3">
            <p className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
              Notifications
            </p>
            <button
              type="button"
              className="font-sans text-caption text-primary disabled:opacity-40"
              disabled={unread === 0 || markAllRead.isPending}
              onClick={() => void markAllRead.mutateAsync()}
            >
              Mark all read
            </button>
          </div>

          {listQuery.isLoading ? (
            <p className="px-4 py-6 text-body-sm text-on-surface-variant">Loading…</p>
          ) : null}
          {listQuery.isError ? (
            <p className="px-4 py-6 text-body-sm text-error">Unable to load notifications.</p>
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-on-surface-variant">You are all caught up.</p>
          ) : null}

          {items.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-outline-variant/20 last:border-0">
                  <button
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-surface-container-low',
                      !item.isRead && 'bg-surface-container-low/60',
                    )}
                    onClick={() => void openItem(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'font-sans text-body-sm text-on-surface',
                          !item.isRead && 'font-medium text-primary',
                        )}
                      >
                        {item.title}
                      </p>
                      {!item.isRead ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 font-sans text-caption text-on-surface-variant">
                      {item.message}
                    </p>
                    <p className="mt-2 font-sans text-caption text-on-surface-variant">
                      {NOTIFICATION_CATEGORY_LABELS[item.category]} ·{' '}
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t border-outline-variant/30 px-4 py-3">
            <Link
              to={notificationsPath}
              className="font-label-caps text-label-caps uppercase tracking-wider text-primary"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
