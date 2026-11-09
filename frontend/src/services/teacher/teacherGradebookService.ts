import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type { ClassSubjectGradebook, TeacherGradebookListItem } from '@/types/gradebook.types';
import type { CreateExaminationBody, Examination, UpdateExaminationBody } from '@/types/ops.types';

export function listTeacherGradebooks(
  query: { academicYearId?: number; academicTermId?: number } = {},
  config?: ApiRequestConfig,
) {
  return teacherApi.get<{ items: TeacherGradebookListItem[] }>(endpoints.teacher.gradebook.list, {
    ...config,
    params: query,
  });
}

export function getTeacherClassSubjectGradebook(
  query: {
    classOfferingId: number;
    subjectId: number;
    academicYearId?: number;
    academicTermId?: number | null;
  },
  config?: ApiRequestConfig,
) {
  return teacherApi.get<ClassSubjectGradebook>(endpoints.teacher.gradebook.classSubject, {
    ...config,
    params: query,
  });
}

export function createTeacherExamination(
  body: CreateExaminationBody & {
    categoryId?: number | null;
    weight?: number;
  },
  config?: ApiRequestConfig,
) {
  return teacherApi.post<{ examination: Examination }>(
    endpoints.teacher.examinations.list,
    body,
    config,
  );
}

export function updateTeacherExamination(
  id: number,
  body: UpdateExaminationBody & {
    categoryId?: number | null;
    weight?: number;
  },
  config?: ApiRequestConfig,
) {
  return teacherApi.patch<{ examination: Examination }>(
    endpoints.teacher.examinations.detail(id),
    body,
    config,
  );
}

export function submitTeacherExamMarks(id: number, config?: ApiRequestConfig) {
  return teacherApi.post<{ examination: Examination }>(
    endpoints.teacher.examinations.submit(id),
    {},
    config,
  );
}
