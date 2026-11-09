import { useQuery } from '@tanstack/react-query';

import type { BlogListQuery } from '@/services/api/apiTypes';
import { queryKeys } from '@/services/api/queryKeys';
import { listBlogPosts } from '@/services/blog/blogService';

export function useBlogPosts(query: BlogListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.blog.posts(query),
    queryFn: ({ signal }) => listBlogPosts(query, { signal }),
    select: (response) => response.data,
  });
}
