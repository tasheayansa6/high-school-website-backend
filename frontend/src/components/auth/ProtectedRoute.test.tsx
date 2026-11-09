import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const useAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuth(),
}));

function wrap(initialPath: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route path="dashboard" element={<div>Protected dashboard</div>} />
          </Route>
          <Route path="/admin/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProtectedRoute', () => {
  it('shows loading while bootstrapping', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: true,
    });
    wrap('/admin/dashboard');
    expect(screen.getByText(/Verifying administrator session/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
    });
    wrap('/admin/dashboard');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });
    wrap('/admin/dashboard');
    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
  });
});
