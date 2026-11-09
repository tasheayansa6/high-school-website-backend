import { useStudentAuth } from '@/hooks/useStudentAuth';

/** Identity summary for the header. Logout lives in the sidebar. */
export function StudentUserMenu() {
  const { student } = useStudentAuth();

  if (!student) {
    return null;
  }

  return (
    <div className="text-right">
      <p className="font-sans text-body-sm font-medium text-primary">
        {student.firstName} {student.lastName}
      </p>
      <p className="font-sans text-caption text-on-surface-variant">
        Student · {student.studentCode} · {student.email}
      </p>
    </div>
  );
}
