import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { studentApi } from '@/services/api/studentApiClient';
import type {
  StudentClassList,
  StudentDashboardOverview,
  StudentEnrollmentData,
  StudentProfileData,
  StudentSubjectList,
} from '@/types/student.types';

export function fetchStudentOverview(config?: ApiRequestConfig) {
  return studentApi.get<StudentDashboardOverview>(endpoints.student.dashboard.overview, config);
}

export function fetchStudentProfile(config?: ApiRequestConfig) {
  return studentApi.get<StudentProfileData>(endpoints.student.profile, config);
}

export function fetchStudentEnrollment(config?: ApiRequestConfig) {
  return studentApi.get<StudentEnrollmentData>(endpoints.student.enrollment, config);
}

export function fetchStudentClasses(config?: ApiRequestConfig) {
  return studentApi.get<StudentClassList>(endpoints.student.classes.list, config);
}

export function fetchStudentSubjects(config?: ApiRequestConfig) {
  return studentApi.get<StudentSubjectList>(endpoints.student.subjects.list, config);
}
