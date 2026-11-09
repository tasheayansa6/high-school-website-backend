import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import type {
  StudentLoginCredentials,
  StudentLoginResult,
  StudentMeResult,
} from '@/types/student.types';

export function loginStudent(credentials: StudentLoginCredentials, config?: ApiRequestConfig) {
  return studentApi.post<StudentLoginResult>(endpoints.student.auth.login, credentials, config);
}

export function fetchStudentMe(config?: ApiRequestConfig) {
  return studentApi.get<StudentMeResult>(endpoints.student.auth.me, config);
}

export function logoutStudent(config?: ApiRequestConfig) {
  return studentApi.post<null>(endpoints.student.auth.logout, undefined, config);
}
