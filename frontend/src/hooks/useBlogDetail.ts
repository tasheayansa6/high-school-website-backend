import { useQuery } from '@tanstack/react-query';

import { ApiClientError } from '@/services/api/apiError';
import { queryKeys } from '@/services/api/queryKeys';
import { getBlogPostBySlug } from '@/services/blog/blogService';

export function useBlogDetail(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.blog.post(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: ({ signal }) => {
      if (!slug) {
        throw new ApiClientError({ message: 'Missing slug', code: 'MISSING_SLUG', status: 400 });
      }
      return getBlogPostBySlug(slug, { signal });
    },
    select: (response) => response.data.post,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
