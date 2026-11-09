import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactMessageForm } from '@/components/forms/ContactMessageForm';

const submitContactMessage = vi.fn();

vi.mock('@/services/contact/contactService', () => ({
  submitContactMessage: (...args: unknown[]) => submitContactMessage(...args),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ContactMessageForm', () => {
  beforeEach(() => {
    submitContactMessage.mockReset();
  });

  it('shows client validation for invalid email and does not submit', async () => {
    const user = userEvent.setup();
    wrap(<ContactMessageForm />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/^Email/i), 'not-valid');
    await user.type(screen.getByLabelText(/Subject/i), 'Hello');
    await user.type(screen.getByLabelText(/Message/i), 'Body text');
    await user.click(screen.getByRole('button', { name: /Send Message/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(submitContactMessage).not.toHaveBeenCalled();
  });

  it('submits to the API and shows the backend success message', async () => {
    submitContactMessage.mockResolvedValue({
      success: true,
      message: 'Contact message submitted successfully',
      data: {
        submission: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Hello',
          createdAt: new Date().toISOString(),
        },
      },
    });

    const user = userEvent.setup();
    wrap(<ContactMessageForm />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/^Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Hello');
    await user.type(screen.getByLabelText(/Message/i), 'Body text for contact.');
    await user.click(screen.getByRole('button', { name: /Send Message/i }));

    await waitFor(() => {
      expect(submitContactMessage).toHaveBeenCalledTimes(1);
    });
    expect(submitContactMessage.mock.calls[0]?.[0]).toMatchObject({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Hello',
      message: 'Body text for contact.',
      phone: null,
    });
    expect(await screen.findByText('Contact message submitted successfully')).toBeInTheDocument();
  });

  it('disables submit while the request is in flight', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    submitContactMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const user = userEvent.setup();
    wrap(<ContactMessageForm />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/^Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Hello');
    await user.type(screen.getByLabelText(/Message/i), 'Body text for contact.');
    await user.click(screen.getByRole('button', { name: /Send Message/i }));

    const submitButton = await screen.findByRole('button', { name: /Please wait/i });
    expect(submitButton).toBeDisabled();

    resolveRequest?.({
      success: true,
      message: 'Contact message submitted successfully',
      data: {
        submission: {
          id: 2,
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Hello',
          createdAt: '',
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Message/i })).toBeEnabled();
    });
  });

  it('shows backend validation errors on fields', async () => {
    const { ApiClientError } = await import('@/services/api/apiError');
    submitContactMessage.mockRejectedValue(
      new ApiClientError({
        message: 'Validation failed',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'subject', message: 'subject is required' }],
      }),
    );

    const user = userEvent.setup();
    wrap(<ContactMessageForm />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/^Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Subject/i), 'Hello');
    await user.type(screen.getByLabelText(/Message/i), 'Body text for contact.');
    await user.click(screen.getByRole('button', { name: /Send Message/i }));

    expect(await screen.findByText('subject is required')).toBeInTheDocument();
  });
});
