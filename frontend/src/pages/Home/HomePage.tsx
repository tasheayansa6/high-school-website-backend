import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { HomeAdmissionStreams } from '@/components/home/HomeAdmissionStreams';
import { HomeCampusLife } from '@/components/home/HomeCampusLife';
import { HomeCommunityBanner } from '@/components/home/HomeCommunityBanner';
import { HomeMeetTeam } from '@/components/home/HomeMeetTeam';
import { HomeNewsGrid } from '@/components/home/HomeNewsGrid';
import { HomeShapingFuture } from '@/components/home/HomeShapingFuture';
import { HomeStatsBar } from '@/components/home/HomeStatsBar';
import { HomeSubjectsGrid } from '@/components/home/HomeSubjectsGrid';
import { HomeUpcomingEvents } from '@/components/home/HomeUpcomingEvents';
import { PortalHero } from '@/components/home/PortalHero';
import { Container } from '@/components/layout/Container';
import { PUBLIC_ROUTES } from '@/config/routes';

/**
 * Public homepage — Fasilides section order.
 */
export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col bg-white">
      <PortalHero />
      <HomeStatsBar />
      <HomeShapingFuture />
      <HomeSubjectsGrid />
      <HomeCampusLife />
      <HomeCommunityBanner />
      <HomeMeetTeam />
      <HomeAdmissionStreams />
      <HomeUpcomingEvents />
      <HomeNewsGrid />

      <section
        id="admission-cta"
        className="scroll-mt-24 bg-primary py-16 text-on-primary md:py-20"
      >
        <Container>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {t('home.admissions.title')}
            </h2>
            <p className="mt-5 font-sans text-body-lg leading-relaxed text-surface-container-highest">
              {t('home.admissions.description', { grades: t('common.gradesLabel') })}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={PUBLIC_ROUTES.admission}
                className="inline-flex min-h-11 w-full items-center justify-center bg-white px-6 font-sans text-sm font-semibold text-primary hover:bg-brand-sage sm:w-auto"
              >
                {t('home.admissions.ctaPrimary')}
              </Link>
              <Link
                to={PUBLIC_ROUTES.contact}
                className="inline-flex min-h-11 w-full items-center justify-center border border-white/35 px-6 font-sans text-sm font-medium text-white hover:bg-white/10 sm:w-auto"
              >
                {t('home.admissions.ctaSecondary')}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
