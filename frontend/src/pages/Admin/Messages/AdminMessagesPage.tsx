import { MessagesWorkspace } from '@/components/messaging/MessagesWorkspace';
import { ADMIN_ROUTES } from '@/config/adminRoutes';

export default function AdminMessagesPage() {
  return (
    <MessagesWorkspace
      portal="admin"
      eyebrow="Admin portal"
      basePath={ADMIN_ROUTES.messages}
      selfType="ADMIN"
    />
  );
}
