import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { NewsletterSubscribeBody, NewsletterTokenBody } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function subscribeNewsletter(
  body: NewsletterSubscribeBody,
  config?: ApiRequestConfig,
) {
  const response = await api.post<null>(endpoints.newsletter.subscribe, body, config);
  return response;
}

export async function confirmNewsletter(token: string, config?: ApiRequestConfig) {
  const response = await api.get<null>(endpoints.newsletter.confirm, {
    ...config,
    params: { token },
  });
  return response;
}

export async function unsubscribeNewsletter(body: NewsletterTokenBody, config?: ApiRequestConfig) {
  const response = await api.post<null>(endpoints.newsletter.unsubscribe, body, config);
  return response;
}
