import { useMutation } from '@tanstack/react-query';

import type { ContactSubmitBody } from '@/services/api/apiTypes';
import { submitContactMessage } from '@/services/contact/contactService';

export function useSubmitContactMessage() {
  return useMutation({
    mutationKey: ['contact', 'submit'],
    mutationFn: (body: ContactSubmitBody) => submitContactMessage(body),
  });
}
