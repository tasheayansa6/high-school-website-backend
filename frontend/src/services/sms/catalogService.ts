import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  CatalogListQuery,
  CreateGradeLevelBody,
  CreateSectionBody,
  CreateSubjectBody,
  SmsGradeLevel,
  SmsPaginatedResult,
  SmsSection,
  SmsSubject,
  UpdateGradeLevelBody,
  UpdateSectionBody,
  UpdateSubjectBody,
} from '@/types/sms.types';

// --- Grade levels -------------------------------------------------------------

const gradeLevels = endpoints.admin.sms.gradeLevels;

export function listGradeLevels(query: CatalogListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsGradeLevel>>(gradeLevels.list, {
    ...config,
    params: query,
  });
}

export function createGradeLevel(body: CreateGradeLevelBody, config?: ApiRequestConfig) {
  return api.post<{ gradeLevel: SmsGradeLevel }>(gradeLevels.list, body, config);
}

export function updateGradeLevel(
  id: number,
  body: UpdateGradeLevelBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ gradeLevel: SmsGradeLevel }>(gradeLevels.detail(id), body, config);
}

export function deleteGradeLevel(id: number, config?: ApiRequestConfig) {
  return api.delete<{ gradeLevel: SmsGradeLevel }>(gradeLevels.detail(id), config);
}

// --- Sections -----------------------------------------------------------------

const sections = endpoints.admin.sms.sections;

export function listSections(query: CatalogListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsSection>>(sections.list, { ...config, params: query });
}

export function createSection(body: CreateSectionBody, config?: ApiRequestConfig) {
  return api.post<{ section: SmsSection }>(sections.list, body, config);
}

export function updateSection(id: number, body: UpdateSectionBody, config?: ApiRequestConfig) {
  return api.patch<{ section: SmsSection }>(sections.detail(id), body, config);
}

export function deleteSection(id: number, config?: ApiRequestConfig) {
  return api.delete<{ section: SmsSection }>(sections.detail(id), config);
}

// --- Subjects -----------------------------------------------------------------

const subjects = endpoints.admin.sms.subjects;

export function listSubjects(query: CatalogListQuery = {}, config?: ApiRequestConfig) {
  return api.get<SmsPaginatedResult<SmsSubject>>(subjects.list, { ...config, params: query });
}

export function createSubject(body: CreateSubjectBody, config?: ApiRequestConfig) {
  return api.post<{ subject: SmsSubject }>(subjects.list, body, config);
}

export function updateSubject(id: number, body: UpdateSubjectBody, config?: ApiRequestConfig) {
  return api.patch<{ subject: SmsSubject }>(subjects.detail(id), body, config);
}

export function deleteSubject(id: number, config?: ApiRequestConfig) {
  return api.delete<{ subject: SmsSubject }>(subjects.detail(id), config);
}
