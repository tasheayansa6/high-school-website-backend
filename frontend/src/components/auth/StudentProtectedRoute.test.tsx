import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { StudentProtectedRoute } from '@/components/auth/StudentProtectedRoute';

const useStudentAuth = vi.fn();

vi.mock('@/hooks/useStudentAuth', () => ({
  useStudentAuth: () => useStudentAuth(),
}));

function wrap(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/student" element={<StudentProtectedRoute />}>
          <Route path="dashboard" element={<div>Student dashboard</div>} />
        </Route>
        <Route path="/student/login" element={<div>Student login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudentProtectedRoute', () => {
  it('shows loading while bootstrapping', () => {
    useStudentAuth.mockReturnValue({ isAuthenticated: false, isBootstrapping: true });
    wrap('/student/dashboard');
    expect(screen.getByText(/Verifying student session/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the student login', () => {
    useStudentAuth.mockReturnValue({ isAuthenticated: false, isBootstrapping: false });
    wrap('/student/dashboard');
    expect(screen.getByText('Student login')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    useStudentAuth.mockReturnValue({ isAuthenticated: true, isBootstrapping: false });
    wrap('/student/dashboard');
    expect(screen.getByText('Student dashboard')).toBeInTheDocument();
  });
});
