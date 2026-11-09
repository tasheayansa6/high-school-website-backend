import { useState } from 'react';
import { Link } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useNotificationActions, useNotificationList } from '@/hooks/useNotifications';
import type { NotificationPortal } from '@/services/notifications/notificationApi';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationItem,
} from '@/types/notification.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/relativeTime';

const PAGE_SIZE = 20;

interface NotificationsPageProps {
  portal: NotificationPortal;
  eyebrow: string;
}

export function NotificationsPage({ portal, eyebrow }: NotificationsPageProps) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<NotificationCategory | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = {
    page,
    limit: PAGE_SIZE,
    ...(category ? { category } : {}),
    ...(unreadOnly ? { isRead: false } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const listQuery = useNotificationList(portal, query);
  const { markRead, markAllRead, archive, remove } = useNotificationActions(portal);
  const items = listQuery.data?.items ?? [];

  async function onOpen(item: NotificationItem) {
    if (!item.isRead) {
      await markRead.mutateAsync(item.id);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl" data-testid={`${portal}-notifications-page`}>
      <CmsSectionHeader
        eyebrow={eyebrow}
        title="Notifications"
        description="Updates from academic, attendance, timetable, and administrative activity for your account."
      />

      <div className="mb-6 flex flex-col gap-3 border border-outline-variant/40 bg-surface-container-lowest p-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
              Category
            </span>
            <select
              className="min-w-40 border border-outline-variant/50 bg-surface px-3 py-2 text-body-sm text-on-surface"
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value as NotificationCategory | '');
              }}
            >
              <option value="">All</option>
              {NOTIFICATION_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {NOTIFICATION_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
              From
            </span>
            <input
              type="date"
              className="border border-outline-variant/50 bg-surface px-3 py-2 text-body-sm"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
              To
            </span>
            <input
              type="date"
              className="border border-outline-variant/50 bg-surface px-3 py-2 text-body-sm"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
            />
          </label>
          <label className="mt-6 flex items-center gap-2 text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                setPage(1);
                setUnreadOnly(event.target.checked);
              }}
            />
            Unread only
          </label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={markAllRead.isPending}
          onClick={() => void markAllRead.mutateAsync()}
        >
          Mark all as read
        </Button>
      </div>

      {listQuery.isLoading ? <LoadingState message="Loading notifications…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load notifications.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="There is nothing matching these filters right now."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'border border-outline-variant/40 bg-surface-container-lowest p-5',
                !item.isRead && 'border-l-4 border-l-secondary',
              )}
              data-testid={`${portal}-notification-row`}
              data-read={item.isRead ? 'true' : 'false'}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-headline-sm text-primary">{item.title}</p>
                  <p className="mt-1 text-body-md text-on-surface">{item.message}</p>
                  <p className="mt-2 text-caption text-on-surface-variant">
                    {NOTIFICATION_CATEGORY_LABELS[item.category]} ·{' '}
                    {formatRelativeTime(item.createdAt)}
                    {!item.isRead ? ' · Unread' : ''}
                  </p>
                  {item.actionPath ? (
                    <Link
                      to={item.actionPath}
                      className="mt-3 inline-flex font-label-caps text-label-caps uppercase tracking-wider text-primary"
                      onClick={() => void onOpen(item)}
                    >
                      Open related page
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.isRead ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => void markRead.mutateAsync(item.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => void archive.mutateAsync(item.id)}
                  >
                    Archive
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => void remove.mutateAsync(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
    </div>
  );
}
