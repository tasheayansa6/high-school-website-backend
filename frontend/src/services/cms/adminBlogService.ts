import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AdminBlogCategory,
  AdminBlogPost,
  AdminPostListQuery,
  CreateCategoryBody,
  CreatePostBody,
  PaginatedResult,
  UpdateCategoryBody,
  UpdatePostBody,
} from '@/types/cms.types';

export async function listAdminPosts(query: AdminPostListQuery = {}, config?: ApiRequestConfig) {
  return api.get<PaginatedResult<AdminBlogPost>>(endpoints.admin.blog.posts, {
    ...config,
    params: query,
  });
}

export async function getAdminPost(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ post: AdminBlogPost }>(endpoints.admin.blog.post(id), {
    ...config,
    params: options,
  });
}

export async function createAdminPost(body: CreatePostBody, config?: ApiRequestConfig) {
  return api.post<{ post: AdminBlogPost }>(endpoints.admin.blog.posts, body, config);
}

export async function updateAdminPost(id: number, body: UpdatePostBody, config?: ApiRequestConfig) {
  return api.patch<{ post: AdminBlogPost }>(endpoints.admin.blog.post(id), body, config);
}

export async function publishAdminPost(id: number, config?: ApiRequestConfig) {
  return api.patch<{ post: AdminBlogPost }>(
    endpoints.admin.blog.publishPost(id),
    undefined,
    config,
  );
}

export async function unpublishAdminPost(id: number, config?: ApiRequestConfig) {
  return api.patch<{ post: AdminBlogPost }>(
    endpoints.admin.blog.unpublishPost(id),
    undefined,
    config,
  );
}

export async function deleteAdminPost(id: number, config?: ApiRequestConfig) {
  return api.delete<{ post: AdminBlogPost }>(endpoints.admin.blog.post(id), config);
}

export async function restoreAdminPost(id: number, config?: ApiRequestConfig) {
  return api.patch<{ post: AdminBlogPost }>(
    endpoints.admin.blog.restorePost(id),
    undefined,
    config,
  );
}

export async function listAdminCategories(
  query: { q?: string; includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ categories: AdminBlogCategory[] }>(endpoints.admin.blog.categories, {
    ...config,
    params: query,
  });
}

export async function createAdminCategory(body: CreateCategoryBody, config?: ApiRequestConfig) {
  return api.post<{ category: AdminBlogCategory }>(endpoints.admin.blog.categories, body, config);
}

export async function updateAdminCategory(
  id: number,
  body: UpdateCategoryBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ category: AdminBlogCategory }>(
    endpoints.admin.blog.category(id),
    body,
    config,
  );
}

export async function deleteAdminCategory(id: number, config?: ApiRequestConfig) {
  return api.delete<{ category: AdminBlogCategory }>(endpoints.admin.blog.category(id), config);
}
