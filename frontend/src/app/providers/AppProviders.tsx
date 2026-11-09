import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollManager } from '@/components/common/ScrollManager';
import { AuthProvider } from '@/context/AuthProvider';
import { StudentAuthProvider } from '@/context/StudentAuthProvider';
import { TeacherAuthProvider } from '@/context/TeacherAuthProvider';
import { createAppQueryClient } from '@/services/api/queryClient';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Central providers. i18n is initialized via `import '@/i18n'` in main.tsx.
 * QueryClient is created once per app mount with API-aware retry defaults.
 * AuthProvider (admin), TeacherAuthProvider and StudentAuthProvider boot after QueryClient. They use separate
 * tokens, clients and 401 events so the sessions never interfere.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollManager />
          <AuthProvider>
            <TeacherAuthProvider>
              <StudentAuthProvider>{children}</StudentAuthProvider>
            </TeacherAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
