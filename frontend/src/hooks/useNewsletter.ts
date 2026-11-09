import { useMutation } from '@tanstack/react-query';

import type { NewsletterSubscribeBody } from '@/services/api/apiTypes';
import { subscribeNewsletter } from '@/services/newsletter/newsletterService';

export function useSubscribeNewsletter() {
  return useMutation({
    mutationKey: ['newsletter', 'subscribe'],
    mutationFn: (body: NewsletterSubscribeBody) => subscribeNewsletter(body),
  });
}
