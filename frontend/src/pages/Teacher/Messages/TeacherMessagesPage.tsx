import { MessagesWorkspace } from '@/components/messaging/MessagesWorkspace';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';

export default function TeacherMessagesPage() {
  return (
    <MessagesWorkspace
      portal="teacher"
      eyebrow="Teacher portal"
      basePath={TEACHER_ROUTES.messages}
      selfType="TEACHER"
    />
  );
}
