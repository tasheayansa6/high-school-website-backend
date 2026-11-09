import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { TeacherProtectedRoute } from '@/components/auth/TeacherProtectedRoute';

const useTeacherAuth = vi.fn();

vi.mock('@/hooks/useTeacherAuth', () => ({
  useTeacherAuth: () => useTeacherAuth(),
}));

function wrap(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/teacher" element={<TeacherProtectedRoute />}>
          <Route path="dashboard" element={<div>Teacher dashboard</div>} />
        </Route>
        <Route path="/teacher/login" element={<div>Teacher login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeacherProtectedRoute', () => {
  it('shows loading while bootstrapping', () => {
    useTeacherAuth.mockReturnValue({ isAuthenticated: false, isBootstrapping: true });
    wrap('/teacher/dashboard');
    expect(screen.getByText(/Verifying teacher session/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the teacher login', () => {
    useTeacherAuth.mockReturnValue({ isAuthenticated: false, isBootstrapping: false });
    wrap('/teacher/dashboard');
    expect(screen.getByText('Teacher login')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    useTeacherAuth.mockReturnValue({ isAuthenticated: true, isBootstrapping: false });
    wrap('/teacher/dashboard');
    expect(screen.getByText('Teacher dashboard')).toBeInTheDocument();
  });
});
