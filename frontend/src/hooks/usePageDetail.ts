import { useQuery } from '@tanstack/react-query';

import { ApiClientError } from '@/services/api/apiError';
import { queryKeys } from '@/services/api/queryKeys';
import { getPageBySlug } from '@/services/pages/pageService';

export function usePageDetail(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pages.detail(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: ({ signal }) => {
      if (!slug) {
        throw new ApiClientError({ message: 'Missing slug', code: 'MISSING_SLUG', status: 400 });
      }
      return getPageBySlug(slug, { signal });
    },
    select: (response) => response.data.page,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
