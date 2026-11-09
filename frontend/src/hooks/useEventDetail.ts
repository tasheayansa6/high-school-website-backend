import { useQuery } from '@tanstack/react-query';

import { ApiClientError } from '@/services/api/apiError';
import { queryKeys } from '@/services/api/queryKeys';
import { getEventBySlug } from '@/services/events/eventService';

export function useEventDetail(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: ({ signal }) => {
      if (!slug) {
        throw new ApiClientError({ message: 'Missing slug', code: 'MISSING_SLUG', status: 400 });
      }
      return getEventBySlug(slug, { signal });
    },
    select: (response) => response.data.event,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
