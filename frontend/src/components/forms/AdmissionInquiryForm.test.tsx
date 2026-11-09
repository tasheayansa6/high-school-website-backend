import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdmissionInquiryForm } from '@/components/forms/AdmissionInquiryForm';
import { ApiClientError } from '@/services/api/apiError';

const submitAdmissionInquiry = vi.fn();
const subscribeNewsletter = vi.fn();

vi.mock('@/services/admissions/admissionsService', () => ({
  submitAdmissionInquiry: (...args: unknown[]) => submitAdmissionInquiry(...args),
}));

vi.mock('@/services/newsletter/newsletterService', () => ({
  subscribeNewsletter: (...args: unknown[]) => subscribeNewsletter(...args),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillValidInquiry(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Prospective Student Full Name/i), 'Amina Bekele');
  await user.type(screen.getByLabelText(/Parent \/ Guardian/i), 'Sara Bekele');
  await user.type(screen.getByLabelText(/Contact Email/i), 'amina@example.com');
  await user.type(screen.getByLabelText(/Phone Number/i), '+251911234567');
  await user.selectOptions(screen.getByLabelText(/Prospective Student Grade/i), 'Grade 9');
  await user.type(
    screen.getByLabelText(/Inquiry Message/i),
    'Please send Grade 9 curriculum information.',
  );
}

describe('AdmissionInquiryForm', () => {
  beforeEach(() => {
    submitAdmissionInquiry.mockReset();
    subscribeNewsletter.mockReset();
  });

  it('does not call newsletter when admissions fails', async () => {
    submitAdmissionInquiry.mockRejectedValue(
      new ApiClientError({
        message: 'Unable to submit',
        status: 500,
        code: 'SERVER_ERROR',
      }),
    );

    const user = userEvent.setup();
    wrap(<AdmissionInquiryForm />);
    await fillValidInquiry(user);
    await user.click(screen.getByRole('button', { name: /Submit Admissions Inquiry/i }));

    await waitFor(() => {
      expect(submitAdmissionInquiry).toHaveBeenCalledTimes(1);
    });
    expect(subscribeNewsletter).not.toHaveBeenCalled();
    expect(await screen.findByText('Unable to submit')).toBeInTheDocument();
  });

  it('submits admissions then newsletter and reports both outcomes', async () => {
    submitAdmissionInquiry.mockResolvedValue({
      success: true,
      message: 'Admission inquiry submitted successfully',
      data: {
        submission: {
          id: 10,
          studentName: 'Amina Bekele',
          email: 'amina@example.com',
          gradeApplyingFor: 'Grade 9',
          academicYear: '2026/2027',
          status: 'NEW',
          createdAt: new Date().toISOString(),
        },
      },
    });
    subscribeNewsletter.mockResolvedValue({
      success: true,
      message: 'If this email can receive messages, a confirmation link has been sent.',
      data: null,
    });

    const user = userEvent.setup();
    wrap(<AdmissionInquiryForm />);
    await fillValidInquiry(user);
    await user.click(screen.getByRole('button', { name: /Submit Admissions Inquiry/i }));

    await waitFor(() => {
      expect(submitAdmissionInquiry).toHaveBeenCalledTimes(1);
      expect(subscribeNewsletter).toHaveBeenCalledTimes(1);
    });

    expect(submitAdmissionInquiry.mock.calls[0]?.[0]).toMatchObject({
      studentName: 'Amina Bekele',
      email: 'amina@example.com',
      gradeApplyingFor: 'Grade 9',
      academicYear: '2026/2027',
    });
    expect(subscribeNewsletter.mock.calls[0]?.[0]).toEqual({ email: 'amina@example.com' });

    expect(await screen.findByText('Admission inquiry submitted successfully')).toBeInTheDocument();
    expect(
      screen.getByText('If this email can receive messages, a confirmation link has been sent.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/check your email to confirm/i)).toBeInTheDocument();
  });

  it('reports newsletter failure separately after admissions success', async () => {
    submitAdmissionInquiry.mockResolvedValue({
      success: true,
      message: 'Admission inquiry submitted successfully',
      data: {
        submission: {
          id: 11,
          studentName: 'Amina Bekele',
          email: 'amina@example.com',
          gradeApplyingFor: 'Grade 9',
          academicYear: '2026/2027',
          status: 'NEW',
          createdAt: new Date().toISOString(),
        },
      },
    });
    subscribeNewsletter.mockRejectedValue(
      new ApiClientError({
        message: 'Too many requests',
        status: 429,
        code: 'RATE_LIMITED',
      }),
    );

    const user = userEvent.setup();
    wrap(<AdmissionInquiryForm />);
    await fillValidInquiry(user);
    await user.click(screen.getByRole('button', { name: /Submit Admissions Inquiry/i }));

    expect(await screen.findByText('Admission inquiry submitted successfully')).toBeInTheDocument();
    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
  });

  it('skips newsletter when checkbox is unchecked', async () => {
    submitAdmissionInquiry.mockResolvedValue({
      success: true,
      message: 'Admission inquiry submitted successfully',
      data: {
        submission: {
          id: 12,
          studentName: 'Amina Bekele',
          email: 'amina@example.com',
          gradeApplyingFor: 'Grade 9',
          academicYear: '2026/2027',
          status: 'NEW',
          createdAt: new Date().toISOString(),
        },
      },
    });

    const user = userEvent.setup();
    wrap(<AdmissionInquiryForm />);
    await fillValidInquiry(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Submit Admissions Inquiry/i }));

    await waitFor(() => {
      expect(submitAdmissionInquiry).toHaveBeenCalledTimes(1);
    });
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });
});
