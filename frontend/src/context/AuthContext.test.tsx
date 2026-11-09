import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/api/authToken';

const loginAdmin = vi.fn();
const fetchAdminProfile = vi.fn();
const logoutAdmin = vi.fn();

vi.mock('@/services/auth/authService', () => ({
  loginAdmin: (...args: unknown[]) => loginAdmin(...args),
  fetchAdminProfile: (...args: unknown[]) => fetchAdminProfile(...args),
  logoutAdmin: (...args: unknown[]) => logoutAdmin(...args),
}));

function Probe() {
  const { status, admin, login, logout, isAuthenticated } = useAuth();
  return (
    <div>
      <p>status:{status}</p>
      <p>auth:{isAuthenticated ? 'yes' : 'no'}</p>
      <p>email:{admin?.email ?? 'none'}</p>
      <button
        type="button"
        onClick={() =>
          void login({ email: 'admin@abyssinia.local', password: 'secret' }).catch(() => undefined)
        }
      >
        Login
      </button>
      <button type="button" onClick={() => void logout()}>
        Logout
      </button>
    </div>
  );
}

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

const admin = {
  id: 1,
  email: 'admin@abyssinia.local',
  firstName: 'Site',
  lastName: 'Admin',
  isActive: true,
  lastLoginAt: null,
  actor: 'admin' as const,
  permissions: ['*'],
};

describe('AuthProvider', () => {
  beforeEach(() => {
    clearAccessToken();
    loginAdmin.mockReset();
    fetchAdminProfile.mockReset();
    logoutAdmin.mockReset();
  });

  it('bootstraps as unauthenticated when no token exists', async () => {
    wrap(<Probe />);
    await waitFor(() => {
      expect(screen.getByText('status:unauthenticated')).toBeInTheDocument();
    });
  });

  it('stores token and admin on successful login', async () => {
    loginAdmin.mockResolvedValue({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'token-abc',
        tokenType: 'Bearer',
        expiresIn: '8h',
        admin,
      },
    });

    const user = userEvent.setup();
    wrap(<Probe />);
    await waitFor(() => {
      expect(screen.getByText('status:unauthenticated')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('status:authenticated')).toBeInTheDocument();
      expect(screen.getByText('email:admin@abyssinia.local')).toBeInTheDocument();
    });
    expect(getAccessToken()).toBe('token-abc');
  });

  it('clears local session after logout and reports server invalidation', async () => {
    setAccessToken('token-abc');
    fetchAdminProfile.mockResolvedValue({
      success: true,
      message: 'Administrator profile retrieved',
      data: { admin },
    });
    logoutAdmin.mockResolvedValue({
      success: true,
      message: 'Logout successful. Existing access tokens for this account are no longer valid.',
      data: null,
    });

    const user = userEvent.setup();
    wrap(<Probe />);

    await waitFor(() => {
      expect(screen.getByText('status:authenticated')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByText('status:unauthenticated')).toBeInTheDocument();
    });
    expect(getAccessToken()).toBeNull();
    expect(logoutAdmin).toHaveBeenCalledTimes(1);
  });

  it('still clears local state when logout request fails with a network error', async () => {
    setAccessToken('token-abc');
    fetchAdminProfile.mockResolvedValue({
      success: true,
      message: 'Administrator profile retrieved',
      data: { admin },
    });
    logoutAdmin.mockRejectedValue(new Error('Network down'));

    const user = userEvent.setup();
    wrap(<Probe />);
    await waitFor(() => {
      expect(screen.getByText('status:authenticated')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Logout' }));
    });

    await waitFor(() => {
      expect(screen.getByText('status:unauthenticated')).toBeInTheDocument();
    });
    expect(getAccessToken()).toBeNull();
  });
});
