import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { FormAlert } from '@/components/forms/FormAlert';
import { Container } from '@/components/layout/Container';
import { LoadingState } from '@/components/ui/LoadingState';
import { PUBLIC_ROUTES } from '@/config/routes';
import { unsubscribeNewsletter } from '@/services/newsletter/newsletterService';
import { getErrorMessage } from '@/utils/apiMessage';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/**
 * Public landing for newsletter unsubscribe links (`APP_PUBLIC_URL/newsletter/unsubscribe?token=`).
 * Calls `POST /api/v1/newsletter/unsubscribe`.
 */
export default function NewsletterUnsubscribePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setStatus({
        kind: 'error',
        message: t('newsletterPages.unsubscribe.missingToken'),
      });
      return;
    }

    setStatus({ kind: 'loading' });
    void unsubscribeNewsletter({ token })
      .then((response) => {
        setStatus({ kind: 'success', message: response.message });
      })
      .catch((error) => {
        setStatus({
          kind: 'error',
          message: getErrorMessage(error, t('newsletterPages.unsubscribe.failed')),
        });
      });
  }, [token, t]);

  return (
    <div className="bg-white py-16">
      <Container className="max-w-xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
          {t('newsletterPages.unsubscribe.title')}
        </h1>
        <p className="mt-3 font-sans text-body-md text-on-surface-variant">
          {t('newsletterPages.unsubscribe.description')}
        </p>

        <div className="mt-8">
          {status.kind === 'loading' || status.kind === 'idle' ? (
            <LoadingState message={t('newsletterPages.unsubscribe.loading')} />
          ) : null}
          {status.kind === 'success' ? (
            <FormAlert tone="success">{status.message}</FormAlert>
          ) : null}
          {status.kind === 'error' ? (
            <FormAlert tone="error">{status.message}</FormAlert>
          ) : null}
        </div>

        <Link
          to={PUBLIC_ROUTES.home}
          className="mt-8 inline-flex font-sans text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('common.returnHome')}
        </Link>
      </Container>
    </div>
  );
}
