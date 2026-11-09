import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AcademicYearListQuery,
  CreateAcademicTermBody,
  CreateAcademicYearBody,
  SmsAcademicTerm,
  SmsAcademicYear,
  SmsPaginatedResult,
  UpdateAcademicTermBody,
  UpdateAcademicYearBody,
} from '@/types/sms.types';

const e = endpoints.admin.sms.academicYears;

export function listAcademicYears(query: AcademicYearListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsAcademicYear>>(e.list, { ...config, params: query });
}

export function getAcademicYear(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ academicYear: SmsAcademicYear }>(e.detail(id), {
    ...config,
    params: options,
  });
}

export function createAcademicYear(body: CreateAcademicYearBody, config?: ApiRequestConfig) {
  return api.post<{ academicYear: SmsAcademicYear }>(e.list, body, config);
}

export function updateAcademicYear(
  id: number,
  body: UpdateAcademicYearBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ academicYear: SmsAcademicYear }>(e.detail(id), body, config);
}

export function setCurrentAcademicYear(id: number, config?: ApiRequestConfig) {
  return api.patch<{ academicYear: SmsAcademicYear }>(e.setCurrent(id), undefined, config);
}

export function deleteAcademicYear(id: number, config?: ApiRequestConfig) {
  return api.delete<{ academicYear: SmsAcademicYear }>(e.detail(id), config);
}

export function listAcademicTerms(yearId: number, config?: ApiRequestConfig) {
  return api.get<{ items: SmsAcademicTerm[] }>(e.terms(yearId), config);
}

export function createAcademicTerm(
  yearId: number,
  body: CreateAcademicTermBody,
  config?: ApiRequestConfig,
) {
  return api.post<{ academicTerm: SmsAcademicTerm }>(e.terms(yearId), body, config);
}

export function updateAcademicTerm(
  yearId: number,
  termId: number,
  body: UpdateAcademicTermBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ academicTerm: SmsAcademicTerm }>(e.term(yearId, termId), body, config);
}
