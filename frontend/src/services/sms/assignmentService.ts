import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  Assignment,
  AssignmentListQuery,
  AssignmentSubmission,
  CreateAssignmentBody,
  GradeSubmissionBody,
  OpsPaginated,
  SubmissionList,
  SubmissionListQuery,
  UpdateAssignmentBody,
} from '@/types/ops.types';

const e = endpoints.admin.sms.assignments;

export function listAssignments(query: AssignmentListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<Assignment>>(e.list, { ...config, params: query });
}

export function createAssignment(body: CreateAssignmentBody, config?: ApiRequestConfig) {
  return api.post<{ assignment: Assignment }>(e.list, body, config);
}

export function updateAssignment(
  id: number,
  body: UpdateAssignmentBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ assignment: Assignment }>(e.detail(id), body, config);
}

export function deleteAssignment(id: number, config?: ApiRequestConfig) {
  return api.delete<{ assignment: Assignment }>(e.detail(id), config);
}

export function listSubmissions(
  id: number,
  query: SubmissionListQuery = {},
  config?: ApiRequestConfig,
) {
  return api.get<SubmissionList>(e.submissions(id), { ...config, params: query });
}

export function gradeSubmission(
  id: number,
  submissionId: number,
  body: GradeSubmissionBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ submission: AssignmentSubmission }>(
    e.gradeSubmission(id, submissionId),
    body,
    config,
  );
}
