import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import type { StudentGradebookSummary } from '@/types/gradebook.types';

export function getStudentGradebookSummary(
  query: { academicYearId?: number; academicTermId?: number } = {},
  config?: ApiRequestConfig,
) {
  return studentApi.get<StudentGradebookSummary>(endpoints.student.gradebookSummary, {
    ...config,
    params: query,
  });
}
