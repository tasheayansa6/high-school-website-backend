import { useQuery } from '@tanstack/react-query';

import type { PageListQuery } from '@/services/api/apiTypes';
import { queryKeys } from '@/services/api/queryKeys';
import { listPages } from '@/services/pages/pageService';

export function usePages(query: PageListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.pages.list(query),
    queryFn: ({ signal }) => listPages(query, { signal }),
    select: (response) => response.data,
  });
}
