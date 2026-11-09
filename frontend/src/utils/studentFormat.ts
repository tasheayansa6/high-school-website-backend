import type { StudentClassSummary, StudentTeacherRef } from '@/types/student.types';

/** e.g. "Grade 9 · Section A · 2025/26" */
export function studentClassSubtitle(offering: StudentClassSummary): string {
  return `${offering.gradeLevel.name} · Section ${offering.section.name} · ${offering.academicYear.name}`;
}

export function teacherName(teacher: StudentTeacherRef | null): string {
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Teacher unavailable';
}
