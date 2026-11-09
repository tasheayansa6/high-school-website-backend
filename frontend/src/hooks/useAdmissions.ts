import { useMutation } from '@tanstack/react-query';

import { submitAdmissionInquiry } from '@/services/admissions/admissionsService';
import type { AdmissionInquiryBody } from '@/services/api/apiTypes';

export function useSubmitAdmissionInquiry() {
  return useMutation({
    mutationKey: ['admissions', 'submit'],
    mutationFn: (body: AdmissionInquiryBody) => submitAdmissionInquiry(body),
  });
}
