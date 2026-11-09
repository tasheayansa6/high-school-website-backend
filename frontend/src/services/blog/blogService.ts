import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { BlogCategory, BlogListQuery, BlogPost, PaginatedList } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function listBlogPosts(query: BlogListQuery = {}, config?: ApiRequestConfig) {
  const response = await api.get<PaginatedList<BlogPost>>(endpoints.blog.posts, {
    ...config,
    params: query,
  });
  return response;
}

export async function getBlogPostBySlug(slug: string, config?: ApiRequestConfig) {
  const response = await api.get<{ post: BlogPost }>(endpoints.blog.post(slug), config);
  return response;
}

export async function listBlogCategories(config?: ApiRequestConfig) {
  const response = await api.get<{ categories: BlogCategory[] }>(endpoints.blog.categories, config);
  return response;
}

export async function listBlogPostsByCategory(
  categorySlug: string,
  query: BlogListQuery = {},
  config?: ApiRequestConfig,
) {
  const response = await api.get<PaginatedList<BlogPost>>(
    endpoints.blog.categoryPosts(categorySlug),
    {
      ...config,
      params: query,
    },
  );
  return response;
}
