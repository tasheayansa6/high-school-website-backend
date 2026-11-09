import { useQuery } from '@tanstack/react-query';

import type { EventListQuery } from '@/services/api/apiTypes';
import { queryKeys } from '@/services/api/queryKeys';
import { listEvents } from '@/services/events/eventService';

export function useEvents(query: EventListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: ({ signal }) => listEvents(query, { signal }),
    select: (response) => response.data,
  });
}
