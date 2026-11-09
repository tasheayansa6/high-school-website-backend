import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AuthSplitShell } from '@/components/auth/AuthSplitShell';
import { ASSETS } from '@/config/assets';
import { contentPagePath, PUBLIC_ROUTES } from '@/config/routes';

interface SignInShellProps {
  children: ReactNode;
  /** Optional step dots (1-based active index). */
  step?: { active: number; total: number };
  welcomeTitle?: ReactNode;
  welcomeSubtitle?: ReactNode;
}

/** Shared auth chrome for role picker + student login. */
export function SignInShell({
  children,
  step,
  welcomeTitle,
  welcomeSubtitle,
}: SignInShellProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <AuthSplitShell
      welcomeTitle={welcomeTitle ?? t('signin.welcomeBack')}
      welcomeSubtitle={
        welcomeSubtitle ??
        t('signin.welcomeSubtitle', {
          defaultValue: 'Log in to continue your journey and get things done.',
        })
      }
      imageSrc={ASSETS.heroStudents.src}
      imageAlt={ASSETS.heroStudents.alt}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to={PUBLIC_ROUTES.home}
          className="font-sans text-caption font-medium text-on-surface-variant underline-offset-2 hover:text-primary hover:underline"
        >
          ← {t('nav.home')}
        </Link>
        {step ? (
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: step.total }, (_, index) => (
              <span
                key={index}
                className={
                  index + 1 === step.active
                    ? 'h-2 w-2 rounded-full bg-primary'
                    : 'h-2 w-2 rounded-full bg-outline-variant'
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      {children}

      <div className="mt-8 space-y-1 border-t border-outline-variant/40 pt-5 text-center font-sans text-caption text-on-surface-variant">
        <p>
          <Link
            to={contentPagePath('privacy-policy')}
            className="underline-offset-2 hover:text-primary hover:underline"
          >
            {t('footer.legal.privacy')}
          </Link>
          {' · '}
          {t('footer.copyright', {
            year,
            location: t('common.locationLine'),
          })}
        </p>
        <p>{t('signin.help')}</p>
      </div>
    </AuthSplitShell>
  );
}
