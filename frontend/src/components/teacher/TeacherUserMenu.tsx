import { useTeacherAuth } from '@/hooks/useTeacherAuth';

/** Identity summary for the header. Logout lives in the sidebar. */
export function TeacherUserMenu() {
  const { teacher } = useTeacherAuth();

  if (!teacher) {
    return null;
  }

  return (
    <div className="text-right">
      <p className="font-sans text-body-sm font-medium text-primary">
        {teacher.firstName} {teacher.lastName}
      </p>
      <p className="font-sans text-caption text-on-surface-variant">
        Teacher · {teacher.employeeCode ? `${teacher.employeeCode} · ` : ''}
        {teacher.email}
      </p>
    </div>
  );
}
