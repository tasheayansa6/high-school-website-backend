import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { ContactSubmissionReceipt, ContactSubmitBody } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function submitContactMessage(body: ContactSubmitBody, config?: ApiRequestConfig) {
  const response = await api.post<{ submission: ContactSubmissionReceipt }>(
    endpoints.contact.submit,
    body,
    config,
  );
  return response;
}
