import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';

/** Full-bleed hero — brand-led, human, calm. */
export function PortalHero() {
  const { t } = useTranslation();

  return (
    <section
      id="home-top"
      className="relative min-h-[min(78svh,40rem)] w-full overflow-hidden bg-primary-container text-on-primary sm:min-h-[min(88svh,46rem)]"
    >
      <img
        src={ASSETS.heroStudents.src}
        alt={t('common.studentsImageAlt')}
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[65%_28%] sm:object-[72%_28%]"
        decoding="async"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-brand-evergreen/92 via-brand-evergreen/55 to-transparent sm:via-brand-evergreen/45"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-brand-evergreen/50 via-transparent to-brand-evergreen/15"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[min(78svh,40rem)] max-w-7xl items-end px-margin-mobile pb-20 pt-24 sm:min-h-[min(88svh,46rem)] sm:pb-24 sm:pt-28 md:items-center md:px-margin md:pb-28">
        <div className="w-full max-w-xl">
          <p className="mb-4 font-display text-lg text-secondary-fixed sm:text-xl">
            {t('common.siteName')}
          </p>
          <h1 className="font-display text-display-hero leading-[1.08] tracking-tight break-words text-white">
            {t('home.hero.title')}
          </h1>
          <p className="mt-5 max-w-md font-sans text-body-md leading-relaxed text-white/90 sm:mt-6 sm:text-body-lg">
            {t('home.hero.description')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <Link
              to={PUBLIC_ROUTES.about}
              className="inline-flex min-h-11 w-full items-center justify-center bg-white px-6 py-2.5 font-sans text-sm font-semibold text-primary transition-colors hover:bg-brand-sage sm:w-auto"
            >
              {t('home.hero.ctaPrimary')}
            </Link>
            <Link
              to={PUBLIC_ROUTES.contact}
              className="inline-flex min-h-11 items-center justify-center font-sans text-sm font-medium text-white/95 underline-offset-4 hover:underline sm:justify-start"
            >
              {t('home.hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>

      <a
        href="#stats"
        className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-white/85 transition-opacity hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        aria-label={t('home.hero.scrollDown')}
      >
        <span className="font-sans text-caption">{t('home.hero.scrollDown')}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
      </a>
    </section>
  );
}
