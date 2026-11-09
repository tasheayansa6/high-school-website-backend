import '@/i18n';

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SiteHeader } from '@/components/layout/SiteHeader';

describe('SiteHeader', () => {
  it('renders brand and primary navigation links', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(screen.getByText('Abyssinia Academy')).toBeInTheDocument();
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(primaryNav).getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    );
  });
});
