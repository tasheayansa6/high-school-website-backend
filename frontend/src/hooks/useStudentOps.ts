import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchStudentAnnouncements,
  fetchStudentAssignments,
  fetchStudentAttendance,
  fetchStudentExamResults,
  fetchStudentFees,
} from '@/services/student/studentOpsService';
import type {
  AttendanceListQuery,
  StudentAnnouncementsQuery,
  StudentAssignmentListQuery,
  StudentExamResultsQuery,
  StudentOwnFeesQuery,
} from '@/types/ops.types';

const STALE_MS = 15_000;

export function useStudentAttendance(
  query: Pick<AttendanceListQuery, 'page' | 'limit' | 'status' | 'from' | 'to'>,
) {
  return useQuery({
    queryKey: queryKeys.student.attendance({ ...query }),
    queryFn: ({ signal }) => fetchStudentAttendance(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentAssignments(query: StudentAssignmentListQuery) {
  return useQuery({
    queryKey: queryKeys.student.assignments({ ...query }),
    queryFn: ({ signal }) => fetchStudentAssignments(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentExamResults(query: StudentExamResultsQuery) {
  return useQuery({
    queryKey: queryKeys.student.examResults({ ...query }),
    queryFn: ({ signal }) => fetchStudentExamResults(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentFees(query: StudentOwnFeesQuery) {
  return useQuery({
    queryKey: queryKeys.student.fees({ ...query }),
    queryFn: ({ signal }) => fetchStudentFees(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentAnnouncements(query: StudentAnnouncementsQuery) {
  return useQuery({
    queryKey: queryKeys.student.announcements({ ...query }),
    queryFn: ({ signal }) => fetchStudentAnnouncements(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}
