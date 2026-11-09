import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { PaginatedList } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';
import type {
  AssessmentCategory,
  ClassSubjectGradebook,
  GradebookOverviewItem,
  GradingScale,
  PendingSubmission,
} from '@/types/gradebook.types';
import type { Examination } from '@/types/ops.types';

const e = endpoints.admin.sms.gradebook;

export function listGradebookOverview(
  query: Record<string, string | number | boolean | undefined> = {},
  config?: ApiRequestConfig,
) {
  return api.get<PaginatedList<GradebookOverviewItem>>(e.overview, { ...config, params: query });
}

export function getAdminClassSubjectGradebook(
  query: {
    classOfferingId: number;
    subjectId: number;
    academicYearId?: number;
    academicTermId?: number | null;
  },
  config?: ApiRequestConfig,
) {
  return api.get<ClassSubjectGradebook>(e.classSubject, { ...config, params: query });
}

export function listPendingSubmissions(
  query: Record<string, string | number | undefined> = {},
  config?: ApiRequestConfig,
) {
  return api.get<PaginatedList<PendingSubmission>>(e.pending, { ...config, params: query });
}

export function listGradingScales(config?: ApiRequestConfig) {
  return api.get<{ items: GradingScale[] }>(e.scales, config);
}

export function createGradingScale(body: Record<string, unknown>, config?: ApiRequestConfig) {
  return api.post<{ gradingScale: GradingScale }>(e.scales, body, config);
}

export function updateGradingScale(
  id: number,
  body: Record<string, unknown>,
  config?: ApiRequestConfig,
) {
  return api.patch<{ gradingScale: GradingScale }>(e.scale(id), body, config);
}

export function listAssessmentCategories(
  query: Record<string, string | number | boolean | undefined> = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ items: AssessmentCategory[] }>(e.categories, { ...config, params: query });
}

export function createAssessmentCategory(body: Record<string, unknown>, config?: ApiRequestConfig) {
  return api.post<{ category: AssessmentCategory }>(e.categories, body, config);
}

export function updateAssessmentCategory(
  id: number,
  body: Record<string, unknown>,
  config?: ApiRequestConfig,
) {
  return api.patch<{ category: AssessmentCategory }>(e.category(id), body, config);
}

export function validateWeights(
  body: {
    weights: number[];
    weightMode?: string;
    gradingScaleId?: number;
  },
  config?: ApiRequestConfig,
) {
  return api.post<{ valid: boolean; message: string | null; sum: number }>(
    e.validateWeights,
    body,
    config,
  );
}

export function approveGradebookExamination(id: number, config?: ApiRequestConfig) {
  return api.post<{ examination: Examination }>(e.approve(id), {}, config);
}

export function rejectGradebookExamination(
  id: number,
  body: { reason?: string } = {},
  config?: ApiRequestConfig,
) {
  return api.post<{ examination: Examination }>(e.reject(id), body, config);
}

export function reopenGradebookExamination(
  id: number,
  body: { reason?: string } = {},
  config?: ApiRequestConfig,
) {
  return api.post<{ examination: Examination }>(e.reopen(id), body, config);
}
