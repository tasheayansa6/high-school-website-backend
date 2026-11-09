import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { LoadingState } from '@/components/ui/LoadingState';

export function RouteLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[50vh] bg-surface pt-24" role="status" aria-live="polite">
      <Container className="py-16">
        <LoadingState message={t('common.loadingPage')} />
      </Container>
    </div>
  );
}
