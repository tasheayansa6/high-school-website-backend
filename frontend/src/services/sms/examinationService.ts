import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CreateExaminationBody,
  Examination,
  ExaminationListQuery,
  ExamResultList,
  OpsPaginated,
  UpdateExaminationBody,
  UpsertExamResultsBody,
  UpsertExamResultsResult,
} from '@/types/ops.types';

const e = endpoints.admin.sms.examinations;

export function listExaminations(query: ExaminationListQuery = {}, config?: ApiRequestConfig) {
  return api.get<OpsPaginated<Examination>>(e.list, { ...config, params: query });
}

export function createExamination(body: CreateExaminationBody, config?: ApiRequestConfig) {
  return api.post<{ examination: Examination }>(e.list, body, config);
}

export function updateExamination(
  id: number,
  body: UpdateExaminationBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ examination: Examination }>(e.detail(id), body, config);
}

export function publishExamination(id: number, config?: ApiRequestConfig) {
  return api.post<{ examination: Examination }>(e.publish(id), undefined, config);
}

export function deleteExamination(id: number, config?: ApiRequestConfig) {
  return api.delete<{ examination: Examination }>(e.detail(id), config);
}

export function listExamResults(id: number, config?: ApiRequestConfig) {
  return api.get<ExamResultList>(e.results(id), { ...config, params: { limit: 100 } });
}

export function saveExamResults(
  id: number,
  body: UpsertExamResultsBody,
  config?: ApiRequestConfig,
) {
  return api.put<UpsertExamResultsResult>(e.results(id), body, config);
}

export function deleteExamResult(id: number, resultId: number, config?: ApiRequestConfig) {
  return api.delete(e.result(id, resultId), config);
}
