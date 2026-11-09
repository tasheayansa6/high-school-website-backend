import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  TeacherClassDetail,
  TeacherClassList,
  TeacherDashboardOverview,
  TeacherProfileData,
  TeacherStudentList,
  TeacherStudentListQuery,
  TeacherSubjectList,
} from '@/types/teacher.types';

export function fetchTeacherOverview(config?: ApiRequestConfig) {
  return teacherApi.get<TeacherDashboardOverview>(endpoints.teacher.dashboard.overview, config);
}

export function fetchTeacherProfile(config?: ApiRequestConfig) {
  return teacherApi.get<TeacherProfileData>(endpoints.teacher.profile, config);
}

export function fetchTeacherClasses(config?: ApiRequestConfig) {
  return teacherApi.get<TeacherClassList>(endpoints.teacher.classes.list, config);
}

export function fetchTeacherClass(id: number, config?: ApiRequestConfig) {
  return teacherApi.get<TeacherClassDetail>(endpoints.teacher.classes.detail(id), config);
}

export function fetchTeacherSubjects(config?: ApiRequestConfig) {
  return teacherApi.get<TeacherSubjectList>(endpoints.teacher.subjects.list, config);
}

export function fetchTeacherStudents(
  query: TeacherStudentListQuery = {},
  config?: ApiRequestConfig,
) {
  return teacherApi.get<TeacherStudentList>(endpoints.teacher.students.list, {
    ...config,
    params: query,
  });
}
