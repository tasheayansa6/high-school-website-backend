import type { ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import { teacherApi } from '@/services/api/teacherApiClient';
import type { TimetableEntry, Weekday } from '@/types/timetable.types';

export function fetchTeacherTimetable(
  query: { dayOfWeek?: Weekday } = {},
  config?: ApiRequestConfig,
) {
  return teacherApi.get<{ items: TimetableEntry[] }>(endpoints.teacher.timetable, {
    ...config,
    params: query,
  });
}
