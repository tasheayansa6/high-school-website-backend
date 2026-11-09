import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OverviewStatsSection } from '@/components/admin/dashboard/OverviewStatsSection';
import { ApiClientError } from '@/services/api/apiError';

const fetchDashboardOverview = vi.fn();

vi.mock('@/services/dashboard/dashboardService', () => ({
  fetchDashboardOverview: (...args: unknown[]) => fetchDashboardOverview(...args),
  fetchDashboardRecentActivity: vi.fn(),
  fetchDashboardContentStatistics: vi.fn(),
  fetchDashboardInquiryStatistics: vi.fn(),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('OverviewStatsSection', () => {
  beforeEach(() => {
    fetchDashboardOverview.mockReset();
  });

  it('renders real overview metrics from the API response', async () => {
    fetchDashboardOverview.mockResolvedValue({
      success: true,
      message: 'Dashboard overview retrieved',
      data: {
        overview: {
          pages: { published: 2, draft: 1 },
          blogPosts: { published: 4, draft: 0 },
          contactMessages: { total: 7, new: 3 },
          newsletterSubscribers: { total: 5, active: 2, pending: 3 },
          admissionInquiries: { total: 6, new: 1 },
          events: { upcomingPublished: 8 },
          mediaAssets: { total: 9 },
        },
      },
    });

    wrap(<OverviewStatsSection />);

    const pagesCard = (await screen.findByText('Published pages')).closest('article');
    const postsCard = screen.getByText('Published posts').closest('article');
    const contactCard = screen.getByText('Contact messages').closest('article');
    const admissionsCard = screen.getByText('Admissions inquiries').closest('article');
    const newsletterCard = screen.getByText('Newsletter subscribers').closest('article');
    const mediaCard = screen.getByText('Media assets').closest('article');

    expect(pagesCard).toBeTruthy();
    expect(postsCard).toBeTruthy();
    expect(contactCard).toBeTruthy();
    expect(admissionsCard).toBeTruthy();
    expect(newsletterCard).toBeTruthy();
    expect(mediaCard).toBeTruthy();

    expect(within(pagesCard!).getByText('2')).toBeInTheDocument();
    expect(within(postsCard!).getByText('4')).toBeInTheDocument();
    expect(within(contactCard!).getByText('7')).toBeInTheDocument();
    expect(within(admissionsCard!).getByText('6')).toBeInTheDocument();
    expect(within(newsletterCard!).getByText('5')).toBeInTheDocument();
    expect(within(mediaCard!).getByText('9')).toBeInTheDocument();
  });

  it('shows an error state with retry when the request fails', async () => {
    fetchDashboardOverview
      .mockRejectedValueOnce(
        new ApiClientError({
          message: 'Dashboard unavailable',
          status: 500,
          code: 'SERVER_ERROR',
        }),
      )
      .mockResolvedValueOnce({
        success: true,
        message: 'Dashboard overview retrieved',
        data: {
          overview: {
            pages: { published: 0, draft: 0 },
            blogPosts: { published: 0, draft: 0 },
            contactMessages: { total: 0, new: 0 },
            newsletterSubscribers: { total: 0, active: 0, pending: 0 },
            admissionInquiries: { total: 0, new: 0 },
            events: { upcomingPublished: 0 },
            mediaAssets: { total: 0 },
          },
        },
      });

    const user = userEvent.setup();
    wrap(<OverviewStatsSection />);

    expect(await screen.findByText('Dashboard unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Published pages')).toBeInTheDocument();
    });
  });
});
