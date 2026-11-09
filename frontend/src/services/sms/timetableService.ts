import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  Classroom,
  ClassroomList,
  CreateTimetableBody,
  CreateTimetableEntryBody,
  Timetable,
  TimetableEntry,
  TimetableList,
  TimetableListQuery,
  UpdateTimetableEntryBody,
} from '@/types/timetable.types';

const e = endpoints.admin.sms.timetables;

export function listTimetables(query: TimetableListQuery = {}, config?: ApiRequestConfig) {
  return api.get<TimetableList>(e.list, { ...config, params: query });
}

export function getTimetable(id: number, config?: ApiRequestConfig) {
  return api.get<{ timetable: Timetable }>(e.detail(id), config);
}

export function createTimetable(body: CreateTimetableBody, config?: ApiRequestConfig) {
  return api.post<{ timetable: Timetable }>(e.list, body, config);
}

export function updateTimetable(
  id: number,
  body: { title?: string | null },
  config?: ApiRequestConfig,
) {
  return api.patch<{ timetable: Timetable }>(e.detail(id), body, config);
}

export function publishTimetable(id: number, config?: ApiRequestConfig) {
  return api.post<{ timetable: Timetable }>(e.publish(id), {}, config);
}

export function unpublishTimetable(id: number, config?: ApiRequestConfig) {
  return api.post<{ timetable: Timetable }>(e.unpublish(id), {}, config);
}

export function deleteTimetable(id: number, config?: ApiRequestConfig) {
  return api.delete<{ timetable: Timetable }>(e.detail(id), config);
}

export function createTimetableEntry(
  timetableId: number,
  body: CreateTimetableEntryBody,
  config?: ApiRequestConfig,
) {
  return api.post<{ entry: TimetableEntry }>(e.entries(timetableId), body, config);
}

export function updateTimetableEntry(
  timetableId: number,
  entryId: number,
  body: UpdateTimetableEntryBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ entry: TimetableEntry }>(e.entry(timetableId, entryId), body, config);
}

export function deleteTimetableEntry(
  timetableId: number,
  entryId: number,
  config?: ApiRequestConfig,
) {
  return api.delete<{ entry: TimetableEntry }>(e.entry(timetableId, entryId), config);
}

export function listClassrooms(
  query: { page?: number; limit?: number; q?: string } = {},
  config?: ApiRequestConfig,
) {
  return api.get<ClassroomList>(e.classrooms.list, { ...config, params: query });
}

export function createClassroom(
  body: { name: string; code: string; capacity?: number | null },
  config?: ApiRequestConfig,
) {
  return api.post<{ classroom: Classroom }>(e.classrooms.list, body, config);
}
