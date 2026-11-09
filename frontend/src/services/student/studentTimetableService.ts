import type { ApiRequestConfig } from '@/services/api/apiClient';
import { studentApi } from '@/services/api/studentApiClient';
import type { Timetable } from '@/types/timetable.types';

/** Matches `endpoints.student.timetable` — literal avoids stale HMR binding issues. */
const STUDENT_TIMETABLE_PATH = '/student/timetable';

export function fetchStudentTimetable(config?: ApiRequestConfig) {
  return studentApi.get<{ items: Timetable[] }>(STUDENT_TIMETABLE_PATH, config);
}
