import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import { endpoints } from '@/services/api/endpoints';
import type {
  AdminMediaAsset,
  AdminMediaListQuery,
  PaginatedResult,
  UpdateMediaBody,
} from '@/types/cms.types';

export async function listAdminMedia(query: AdminMediaListQuery = {}, config?: ApiRequestConfig) {
  return api.get<PaginatedResult<AdminMediaAsset>>(endpoints.admin.media.list, {
    ...config,
    params: query,
  });
}

export async function getAdminMedia(
  id: number,
  options: { includeDeleted?: boolean } = {},
  config?: ApiRequestConfig,
) {
  return api.get<{ media: AdminMediaAsset }>(endpoints.admin.media.detail(id), {
    ...config,
    params: options,
  });
}

export async function uploadAdminMedia(
  file: File,
  fields: {
    altText?: string;
    description?: string;
    isGalleryImage?: boolean;
    sortOrder?: number;
  } = {},
  config?: ApiRequestConfig,
) {
  const formData = new FormData();
  formData.append('file', file);
  if (fields.altText != null && fields.altText !== '') {
    formData.append('altText', fields.altText);
  }
  if (fields.description != null && fields.description !== '') {
    formData.append('description', fields.description);
  }
  if (fields.isGalleryImage != null) {
    formData.append('isGalleryImage', String(fields.isGalleryImage));
  }
  if (fields.sortOrder != null) {
    formData.append('sortOrder', String(fields.sortOrder));
  }
  return api.postFormData<{ media: AdminMediaAsset }>(
    endpoints.admin.media.upload,
    formData,
    config,
  );
}

export async function updateAdminMedia(
  id: number,
  body: UpdateMediaBody,
  config?: ApiRequestConfig,
) {
  return api.patch<{ media: AdminMediaAsset }>(endpoints.admin.media.detail(id), body, config);
}

export async function deleteAdminMedia(id: number, config?: ApiRequestConfig) {
  return api.delete<{ media: AdminMediaAsset }>(endpoints.admin.media.detail(id), config);
}

export async function restoreAdminMedia(id: number, config?: ApiRequestConfig) {
  return api.patch<{ media: AdminMediaAsset }>(
    endpoints.admin.media.restore(id),
    undefined,
    config,
  );
}
