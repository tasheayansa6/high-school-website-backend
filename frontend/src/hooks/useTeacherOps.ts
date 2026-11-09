import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchTeacherAnnouncements,
  fetchTeacherAssignments,
  fetchTeacherAttendance,
  fetchTeacherExaminations,
  fetchTeacherExamResults,
  fetchTeacherSubmissions,
} from '@/services/teacher/teacherOpsService';
import type {
  AssignmentListQuery,
  AttendanceListQuery,
  ExaminationListQuery,
  StudentAnnouncementsQuery,
  SubmissionListQuery,
} from '@/types/ops.types';

const STALE_MS = 15_000;

export function useTeacherAttendance(query: AttendanceListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teacher.attendance.list({ ...query }),
    queryFn: ({ signal }) => fetchTeacherAttendance(query, { signal }),
    select: (response) => response.data,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useTeacherAssignments(query: AssignmentListQuery) {
  return useQuery({
    queryKey: queryKeys.teacher.assignments.list({ ...query }),
    queryFn: ({ signal }) => fetchTeacherAssignments(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherSubmissions(id: number | null, query: SubmissionListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.teacher.assignments.submissions(id ?? 0, { ...query }),
    queryFn: ({ signal }) => fetchTeacherSubmissions(id!, query, { signal }),
    select: (response) => response.data,
    enabled: id !== null,
  });
}

export function useTeacherExaminations(query: ExaminationListQuery) {
  return useQuery({
    queryKey: queryKeys.teacher.examinations.list({ ...query }),
    queryFn: ({ signal }) => fetchTeacherExaminations(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherExamResults(id: number | null) {
  return useQuery({
    queryKey: queryKeys.teacher.examinations.results(id ?? 0),
    queryFn: ({ signal }) => fetchTeacherExamResults(id!, { signal }),
    select: (response) => response.data,
    enabled: id !== null,
  });
}

export function useTeacherAnnouncements(query: StudentAnnouncementsQuery) {
  return useQuery({
    queryKey: queryKeys.teacher.announcements({ ...query }),
    queryFn: ({ signal }) => fetchTeacherAnnouncements(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}
