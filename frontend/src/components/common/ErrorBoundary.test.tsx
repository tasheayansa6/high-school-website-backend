import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders a safe fallback without exposing the error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('errors.boundary.title')).toBeInTheDocument();
    expect(screen.getByText('errors.boundary.message')).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
