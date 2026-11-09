import type { TeacherClassSummary } from '@/types/teacher.types';

export function classTitle(offering: TeacherClassSummary): string {
  return offering.name;
}

/** e.g. "Grade 9 · Section A · 2025/26" */
export function classSubtitle(offering: TeacherClassSummary): string {
  return `${offering.gradeLevel.name} · Section ${offering.section.name} · ${offering.academicYear.name}`;
}
