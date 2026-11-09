import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type {
  TeacherLoginCredentials,
  TeacherLoginResult,
  TeacherMeResult,
} from '@/types/teacher.types';

export function loginTeacher(credentials: TeacherLoginCredentials, config?: ApiRequestConfig) {
  return teacherApi.post<TeacherLoginResult>(endpoints.teacher.auth.login, credentials, config);
}

export function fetchTeacherMe(config?: ApiRequestConfig) {
  return teacherApi.get<TeacherMeResult>(endpoints.teacher.auth.me, config);
}

export function logoutTeacher(config?: ApiRequestConfig) {
  return teacherApi.post<null>(endpoints.teacher.auth.logout, undefined, config);
}
