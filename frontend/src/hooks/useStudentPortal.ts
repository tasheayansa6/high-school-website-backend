import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchStudentClasses,
  fetchStudentOverview,
  fetchStudentProfile,
  fetchStudentSubjects,
} from '@/services/student/studentPortalService';

const STALE_MS = 30_000;

export function useStudentOverview() {
  return useQuery({
    queryKey: queryKeys.student.overview,
    queryFn: ({ signal }) => fetchStudentOverview({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentProfileData() {
  return useQuery({
    queryKey: queryKeys.student.profile,
    queryFn: ({ signal }) => fetchStudentProfile({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentClasses() {
  return useQuery({
    queryKey: queryKeys.student.classes,
    queryFn: ({ signal }) => fetchStudentClasses({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useStudentSubjects() {
  return useQuery({
    queryKey: queryKeys.student.subjects,
    queryFn: ({ signal }) => fetchStudentSubjects({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}
