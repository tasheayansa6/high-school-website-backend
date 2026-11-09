import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary-fixed border-t-primary"
        aria-hidden
      />
      <p className="text-body-md text-on-surface-variant">{message ?? t('common.loading')}</p>
    </div>
  );
}
