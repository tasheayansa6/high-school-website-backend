import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { getPublicAcademicOverview } from '@/services/academic/academicService';

export function usePublicAcademicOverview() {
  return useQuery({
    queryKey: queryKeys.academic.overview,
    queryFn: ({ signal }) => getPublicAcademicOverview({ signal }),
    select: (response) => response.data,
  });
}
