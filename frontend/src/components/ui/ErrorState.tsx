import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  action?: ReactNode;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  className,
  action,
}: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-error-container bg-error-container/40 p-6 text-on-error-container',
        className,
      )}
    >
      <p className="font-label-md text-label-md">{title ?? t('common.somethingWrong')}</p>
      <p className="mt-1 text-body-md">{message}</p>
      {onRetry ? (
        <Button type="button" variant="ghost" size="md" className="mt-4" onClick={onRetry}>
          {retryLabel ?? t('common.tryAgain')}
        </Button>
      ) : null}
      {action}
    </div>
  );
}
