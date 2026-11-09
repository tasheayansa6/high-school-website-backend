import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { listBlogCategories } from '@/services/blog/blogService';

export function useBlogCategories() {
  return useQuery({
    queryKey: queryKeys.blog.categories,
    queryFn: ({ signal }) => listBlogCategories({ signal }),
    select: (response) => response.data.categories,
  });
}
