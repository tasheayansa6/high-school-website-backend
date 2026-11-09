import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  useConversationMessages,
  useConversations,
  useMessagingActions,
  useMessagingContacts,
} from '@/hooks/useMessaging';
import type { MessagingPortal } from '@/services/messaging/messagingApi';
import type { MessagingActorType, MessagingContact } from '@/types/messaging.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/relativeTime';

function personName(person: { firstName: string; lastName: string } | null | undefined) {
  if (!person) return 'Unknown';
  return `${person.firstName} ${person.lastName}`.trim();
}

function actorLabel(type: MessagingActorType) {
  if (type === 'ADMIN') return 'Admin';
  if (type === 'TEACHER') return 'Teacher';
  return 'Student';
}

interface MessagesWorkspaceProps {
  portal: MessagingPortal;
  eyebrow: string;
  basePath: string;
  /** Authenticated actor type for styling "mine" bubbles. */
  selfType: MessagingActorType;
}

export function MessagesWorkspace({ portal, eyebrow, basePath, selfType }: MessagesWorkspaceProps) {
  const navigate = useNavigate();
  const params = useParams();
  const selectedId = params.conversationId ? Number(params.conversationId) : null;

  const [composeOpen, setComposeOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useConversations(portal, { page: 1, limit: 50 });
  const messagesQuery = useConversationMessages(portal, selectedId, { page: 1, limit: 100 });
  const contactsQuery = useMessagingContacts(portal, contactQuery, composeOpen);
  const { start, send, markRead } = useMessagingActions(portal);

  const conversations = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const messages = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data?.items]);
  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId || Number.isNaN(selectedId)) return;
    void markRead.mutateAsync(selectedId).catch(() => undefined);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPickContact(contact: MessagingContact) {
    setActionError(null);
    try {
      const result = await start.mutateAsync({ peerType: contact.type, peerId: contact.id });
      setComposeOpen(false);
      setContactQuery('');
      void navigate(`${basePath}/${result.data.conversation.id}`);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to start this conversation.'));
    }
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setActionError(null);
    try {
      await send.mutateAsync({ id: selectedId, body: draft.trim() });
      setDraft('');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to send this message.'));
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl" data-testid={`${portal}-messages-page`}>
      <CmsSectionHeader
        eyebrow={eyebrow}
        title="Messages"
        description="Secure direct conversations with authorized portal users."
      />

      <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="border border-outline-variant/40 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
            <p className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
              Conversations
            </p>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setActionError(null);
                setComposeOpen(true);
              }}
            >
              New
            </Button>
          </div>

          {actionError && !composeOpen ? (
            <p className="border-b border-outline-variant/20 px-4 py-2 font-sans text-caption text-error">
              {actionError}
            </p>
          ) : null}

          {listQuery.isLoading ? <LoadingState message="Loading…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load conversations.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No conversations"
                description="Start a new message with an eligible contact."
              />
            </div>
          ) : null}

          <ul className="max-h-[28rem] overflow-y-auto">
            {conversations.map((item) => {
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full border-b border-outline-variant/20 px-4 py-3 text-left hover:bg-surface-container-low',
                      active && 'bg-surface-container-low',
                      item.unreadCount > 0 && 'border-l-4 border-l-secondary',
                    )}
                    onClick={() => void navigate(`${basePath}/${item.id}`)}
                    data-testid={`${portal}-conversation-item`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-sans text-body-sm font-medium text-primary">
                        {personName(item.otherParticipant?.person)}
                      </p>
                      {item.unreadCount > 0 ? (
                        <span className="bg-secondary px-1.5 font-label-caps text-[10px] text-on-secondary">
                          {item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-caption text-on-surface-variant">
                      {item.otherParticipant
                        ? actorLabel(item.otherParticipant.participantType)
                        : ''}
                      {item.lastMessageAt ? ` · ${formatRelativeTime(item.lastMessageAt)}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-1 text-caption text-on-surface-variant">
                      {item.lastMessage?.body ?? 'No messages yet'}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex min-h-[32rem] flex-col border border-outline-variant/40 bg-surface-container-lowest">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation or start a new one."
              />
            </div>
          ) : (
            <>
              <header className="border-b border-outline-variant/30 px-4 py-3">
                <p className="font-display text-headline-sm text-primary">
                  {personName(selected?.otherParticipant?.person)}
                </p>
                <p className="text-caption text-on-surface-variant">
                  {selected?.otherParticipant
                    ? actorLabel(selected.otherParticipant.participantType)
                    : 'Conversation'}
                </p>
              </header>

              <div
                className="flex-1 space-y-3 overflow-y-auto p-4"
                data-testid={`${portal}-message-thread`}
              >
                {messagesQuery.isLoading ? <LoadingState message="Loading messages…" /> : null}
                {messagesQuery.isError ? (
                  <ErrorState
                    message={getErrorMessage(messagesQuery.error, 'Unable to load messages.')}
                    onRetry={() => void messagesQuery.refetch()}
                  />
                ) : null}
                {messagesQuery.isSuccess && messages.length === 0 ? (
                  <EmptyState title="No messages yet" description="Send the first message." />
                ) : null}
                {messages.map((message) => {
                  // 1:1 threads: any bubble from this portal actor type is "mine".
                  const mine = message.senderType === selfType;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                      data-testid={`${portal}-message-bubble`}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] px-3 py-2 text-body-sm',
                          mine
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low text-on-surface',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={cn(
                            'mt-1 text-caption',
                            mine ? 'text-on-primary/80' : 'text-on-surface-variant',
                          )}
                        >
                          {formatRelativeTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(event) => void onSend(event)}
                className="flex gap-2 border-t border-outline-variant/30 p-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  placeholder="Write a message…"
                  className="min-w-0 flex-1 border border-outline-variant/50 bg-surface px-3 py-2 text-body-sm"
                  data-testid={`${portal}-message-input`}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!draft.trim() || send.isPending}
                  isLoading={send.isPending}
                >
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      {composeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4">
          <div
            className="w-full max-w-lg border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-lg"
            data-testid={`${portal}-compose-dialog`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-display text-headline-sm text-primary">New conversation</p>
              <Button type="button" variant="ghost" size="md" onClick={() => setComposeOpen(false)}>
                Close
              </Button>
            </div>
            <input
              type="search"
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              placeholder="Search eligible contacts…"
              className="mb-3 w-full border border-outline-variant/50 bg-surface px-3 py-2 text-body-sm"
            />
            {contactsQuery.isLoading ? <LoadingState message="Loading contacts…" /> : null}
            {contactsQuery.isError ? (
              <ErrorState
                message="Unable to load contacts."
                onRetry={() => void contactsQuery.refetch()}
              />
            ) : null}
            {actionError ? (
              <p className="mb-3 font-sans text-caption text-error" role="alert">
                {actionError}
              </p>
            ) : null}
            {contactsQuery.isSuccess && contacts.length === 0 ? (
              <EmptyState
                title="No eligible contacts"
                description="Try another name or email. Teachers and students can message site admins and their assigned classes."
              />
            ) : null}
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {contacts.map((contact) => (
                <li key={`${contact.type}-${contact.id}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-surface-container-low"
                    disabled={start.isPending}
                    onClick={() => void onPickContact(contact)}
                    data-testid={`${portal}-contact-option`}
                  >
                    <p className="font-sans text-body-sm text-primary">{personName(contact)}</p>
                    <p className="text-caption text-on-surface-variant">
                      {actorLabel(contact.type)}
                      {contact.email ? ` · ${contact.email}` : ''}
                      {contact.employeeCode ? ` · ${contact.employeeCode}` : ''}
                      {contact.studentCode ? ` · ${contact.studentCode}` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
