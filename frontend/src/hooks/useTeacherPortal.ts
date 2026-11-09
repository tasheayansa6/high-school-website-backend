import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchTeacherClass,
  fetchTeacherClasses,
  fetchTeacherOverview,
  fetchTeacherProfile,
  fetchTeacherStudents,
  fetchTeacherSubjects,
} from '@/services/teacher/teacherPortalService';
import type { TeacherStudentListQuery } from '@/types/teacher.types';

const STALE_MS = 30_000;

export function useTeacherOverview() {
  return useQuery({
    queryKey: queryKeys.teacher.overview,
    queryFn: ({ signal }) => fetchTeacherOverview({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherProfileData() {
  return useQuery({
    queryKey: queryKeys.teacher.profile,
    queryFn: ({ signal }) => fetchTeacherProfile({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherClasses() {
  return useQuery({
    queryKey: queryKeys.teacher.classes.list,
    queryFn: ({ signal }) => fetchTeacherClasses({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherClass(id: number | null) {
  return useQuery({
    queryKey: queryKeys.teacher.classes.detail(id ?? 0),
    queryFn: ({ signal }) => fetchTeacherClass(id!, { signal }),
    select: (response) => response.data,
    enabled: id !== null,
    staleTime: STALE_MS,
  });
}

export function useTeacherSubjects() {
  return useQuery({
    queryKey: queryKeys.teacher.subjects,
    queryFn: ({ signal }) => fetchTeacherSubjects({ signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}

export function useTeacherStudents(query: TeacherStudentListQuery) {
  return useQuery({
    queryKey: queryKeys.teacher.students.list({ ...query }),
    queryFn: ({ signal }) => fetchTeacherStudents(query, { signal }),
    select: (response) => response.data,
    staleTime: STALE_MS,
  });
}
