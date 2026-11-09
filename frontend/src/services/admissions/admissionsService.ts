import { api, type ApiRequestConfig } from '@/services/api/apiClient';
import type { AdmissionInquiryBody, AdmissionInquiryReceipt } from '@/services/api/apiTypes';
import { endpoints } from '@/services/api/endpoints';

export async function submitAdmissionInquiry(
  body: AdmissionInquiryBody,
  config?: ApiRequestConfig,
) {
  const response = await api.post<{ submission: AdmissionInquiryReceipt }>(
    endpoints.admissions.inquiries,
    body,
    config,
  );
  return response;
}
