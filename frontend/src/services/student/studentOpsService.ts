import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import type {
  Announcement,
  Assignment,
  AssignmentSubmission,
  AttendanceListQuery,
  AttendanceRecord,
  ExamResult,
  OpsPaginated,
  StudentAnnouncementsQuery,
  StudentAssignmentListQuery,
  StudentExamResultsQuery,
  StudentFee,
  StudentOwnFeesQuery,
} from '@/types/ops.types';

const s = endpoints.student;

export function fetchStudentAttendance(
  query: Pick<AttendanceListQuery, 'page' | 'limit' | 'status' | 'from' | 'to'>,
  config?: ApiRequestConfig,
) {
  return studentApi.get<OpsPaginated<AttendanceRecord>>(s.attendance, {
    ...config,
    params: query,
  });
}

export function fetchStudentAssignments(
  query: StudentAssignmentListQuery,
  config?: ApiRequestConfig,
) {
  return studentApi.get<OpsPaginated<Assignment>>(s.assignments.list, {
    ...config,
    params: query,
  });
}

export function submitStudentAssignment(
  id: number,
  body: { content: string },
  config?: ApiRequestConfig,
) {
  return studentApi.post<{ submission: AssignmentSubmission }>(
    s.assignments.submit(id),
    body,
    config,
  );
}

export function fetchStudentExamResults(query: StudentExamResultsQuery, config?: ApiRequestConfig) {
  return studentApi.get<OpsPaginated<ExamResult>>(s.examResults, { ...config, params: query });
}

export function fetchStudentFees(query: StudentOwnFeesQuery, config?: ApiRequestConfig) {
  return studentApi.get<OpsPaginated<StudentFee>>(s.fees, { ...config, params: query });
}

export function fetchStudentAnnouncements(
  query: StudentAnnouncementsQuery,
  config?: ApiRequestConfig,
) {
  return studentApi.get<OpsPaginated<Announcement>>(s.announcements, {
    ...config,
    params: query,
  });
}
