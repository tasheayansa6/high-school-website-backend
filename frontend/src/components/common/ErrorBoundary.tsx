import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { reportClientError } from '@/lib/monitoring';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorFallbackProps {
  onReturnHome: () => void;
}

function ErrorFallback({ onReturnHome }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center bg-surface">
      <Container className="py-20">
        <h1 className="break-words font-display text-headline-lg text-primary">
          {t('errors.boundary.title')}
        </h1>
        <p className="mt-3 max-w-xl text-body-lg text-on-surface-variant">
          {t('errors.boundary.message')}
        </p>
        <Button type="button" className="mt-8" onClick={onReturnHome}>
          {t('errors.boundary.returnHome')}
        </Button>
      </Container>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // Never surface stack traces or secrets to end users; report optionally.
    console.error('Application error boundary caught an error');
    reportClientError(error, {
      source: 'ErrorBoundary',
      componentStack: info.componentStack ? 'present' : 'absent',
    });
  }

  private handleReload = (): void => {
    window.location.assign('/');
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onReturnHome={this.handleReload} />;
    }

    return this.props.children;
  }
}
