import { useQuery } from '@tanstack/react-query';

import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { queryKeys } from '@/services/api/queryKeys';
import { listAcademicYears } from '@/services/sms/academicYearService';
import { listGradeLevels, listSections, listSubjects } from '@/services/sms/catalogService';
import { listClassOfferings } from '@/services/sms/classOfferingService';
import { listTeachers } from '@/services/sms/teacherService';

/** Backend list endpoints cap `limit` at 100. */
export const REFERENCE_LIMIT = 100;

const referenceQuery = { page: 1, limit: REFERENCE_LIMIT } as const;

export function useAcademicYearOptions() {
  return useQuery({
    queryKey: queryKeys.sms.academicYears.list({ ...referenceQuery }),
    queryFn: ({ signal }) => listAcademicYears({ ...referenceQuery }, { signal }),
    select: (response) => response.data.items,
  });
}

export function useGradeLevelOptions() {
  return useQuery({
    queryKey: queryKeys.sms.gradeLevels.list({ ...referenceQuery }),
    queryFn: ({ signal }) => listGradeLevels({ ...referenceQuery }, { signal }),
    select: (response) => response.data.items,
  });
}

export function useSectionOptions() {
  return useQuery({
    queryKey: queryKeys.sms.sections.list({ ...referenceQuery }),
    queryFn: ({ signal }) => listSections({ ...referenceQuery }, { signal }),
    select: (response) => response.data.items,
  });
}

export function useSubjectOptions() {
  return useQuery({
    queryKey: queryKeys.sms.subjects.list({ ...referenceQuery }),
    queryFn: ({ signal }) => listSubjects({ ...referenceQuery }, { signal }),
    select: (response) => response.data.items,
  });
}

/** Teachers require `teachers:manage`; the query stays disabled without it. */
export function useTeacherOptions() {
  const canListTeachers = usePermission(PERMISSIONS.TEACHERS_MANAGE);
  const query = { ...referenceQuery, sortBy: 'lastName', sortOrder: 'asc' } as const;
  const result = useQuery({
    queryKey: queryKeys.sms.teachers.list({ ...query }),
    queryFn: ({ signal }) => listTeachers({ ...query }, { signal }),
    select: (response) => response.data.items,
    enabled: canListTeachers,
  });
  return { ...result, canListTeachers };
}

export function useClassOfferingOptions(academicYearId?: number) {
  const query = {
    ...referenceQuery,
    ...(academicYearId ? { academicYearId } : {}),
  };
  return useQuery({
    queryKey: queryKeys.sms.classOfferings.list({ ...query }),
    queryFn: ({ signal }) => listClassOfferings({ ...query }, { signal }),
    select: (response) => response.data.items,
  });
}
