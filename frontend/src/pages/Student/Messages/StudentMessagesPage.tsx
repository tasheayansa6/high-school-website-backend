import { MessagesWorkspace } from '@/components/messaging/MessagesWorkspace';
import { STUDENT_ROUTES } from '@/config/studentRoutes';

export default function StudentMessagesPage() {
  return (
    <MessagesWorkspace
      portal="student"
      eyebrow="Student portal"
      basePath={STUDENT_ROUTES.messages}
      selfType="STUDENT"
    />
  );
}
