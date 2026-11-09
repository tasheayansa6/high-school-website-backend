import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  Announcement,
  Assignment,
  AssignmentListQuery,
  AssignmentSubmission,
  AttendanceListQuery,
  AttendanceRecord,
  BulkAttendanceBody,
  BulkAttendanceResult,
  CreateAssignmentBody,
  Examination,
  ExaminationListQuery,
  ExamResultList,
  GradeSubmissionBody,
  OpsPaginated,
  StudentAnnouncementsQuery,
  SubmissionList,
  SubmissionListQuery,
  UpdateAssignmentBody,
  UpsertExamResultsBody,
  UpsertExamResultsResult,
} from '@/types/ops.types';

const t = endpoints.teacher;

export function fetchTeacherAttendance(query: AttendanceListQuery, config?: ApiRequestConfig) {
  return teacherApi.get<OpsPaginated<AttendanceRecord>>(t.attendance.list, {
    ...config,
    params: query,
  });
}

export function bulkMarkTeacherAttendance(body: BulkAttendanceBody, config?: ApiRequestConfig) {
  return teacherApi.post<BulkAttendanceResult>(t.attendance.bulk, body, config);
}

export function fetchTeacherAssignments(query: AssignmentListQuery, config?: ApiRequestConfig) {
  return teacherApi.get<OpsPaginated<Assignment>>(t.assignments.list, {
    ...config,
    params: query,
  });
}

export function createTeacherAssignment(body: CreateAssignmentBody, config?: ApiRequestConfig) {
  return teacherApi.post<{ assignment: Assignment }>(t.assignments.list, body, config);
}

export function updateTeacherAssignment(
  id: number,
  body: UpdateAssignmentBody,
  config?: ApiRequestConfig,
) {
  return teacherApi.patch<{ assignment: Assignment }>(t.assignments.detail(id), body, config);
}

export function deleteTeacherAssignment(id: number, config?: ApiRequestConfig) {
  return teacherApi.delete<{ assignment: Assignment }>(t.assignments.detail(id), config);
}

export function fetchTeacherSubmissions(
  id: number,
  query: SubmissionListQuery,
  config?: ApiRequestConfig,
) {
  return teacherApi.get<SubmissionList>(t.assignments.submissions(id), {
    ...config,
    params: query,
  });
}

export function gradeTeacherSubmission(
  id: number,
  submissionId: number,
  body: GradeSubmissionBody,
  config?: ApiRequestConfig,
) {
  return teacherApi.patch<{ submission: AssignmentSubmission }>(
    t.assignments.gradeSubmission(id, submissionId),
    body,
    config,
  );
}

export function fetchTeacherExaminations(query: ExaminationListQuery, config?: ApiRequestConfig) {
  return teacherApi.get<OpsPaginated<Examination>>(t.examinations.list, {
    ...config,
    params: query,
  });
}

export function fetchTeacherExamResults(id: number, config?: ApiRequestConfig) {
  return teacherApi.get<ExamResultList>(t.examinations.results(id), {
    ...config,
    params: { limit: 100 },
  });
}

export function saveTeacherExamResults(
  id: number,
  body: UpsertExamResultsBody,
  config?: ApiRequestConfig,
) {
  return teacherApi.put<UpsertExamResultsResult>(t.examinations.results(id), body, config);
}

export function fetchTeacherAnnouncements(
  query: StudentAnnouncementsQuery,
  config?: ApiRequestConfig,
) {
  return teacherApi.get<OpsPaginated<Announcement>>(t.announcements, {
    ...config,
    params: query,
  });
}
