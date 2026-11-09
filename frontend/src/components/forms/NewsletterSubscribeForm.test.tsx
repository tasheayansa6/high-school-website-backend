import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewsletterSubscribeForm } from '@/components/forms/NewsletterSubscribeForm';

const subscribeNewsletter = vi.fn();

vi.mock('@/services/newsletter/newsletterService', () => ({
  subscribeNewsletter: (...args: unknown[]) => subscribeNewsletter(...args),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NewsletterSubscribeForm', () => {
  beforeEach(() => {
    subscribeNewsletter.mockReset();
  });

  it('rejects invalid email without calling the API', async () => {
    const user = userEvent.setup();
    wrap(<NewsletterSubscribeForm variant="page" />);

    await user.type(screen.getByLabelText(/^Email/i), 'bad-email');
    await user.click(screen.getByRole('button', { name: /subscribe|notify/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });

  it('shows the backend double opt-in message on success', async () => {
    subscribeNewsletter.mockResolvedValue({
      success: true,
      message: 'If this email can receive messages, a confirmation link has been sent.',
      data: null,
    });

    const user = userEvent.setup();
    wrap(<NewsletterSubscribeForm variant="page" />);

    await user.type(screen.getByLabelText(/^Email/i), 'family@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe|notify/i }));

    await waitFor(() => {
      expect(subscribeNewsletter).toHaveBeenCalledWith({ email: 'family@example.com' });
    });
    expect(
      await screen.findByText(
        'If this email can receive messages, a confirmation link has been sent.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/check your email to confirm/i)).toBeInTheDocument();
  });
});
