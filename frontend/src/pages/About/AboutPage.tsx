import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Container } from '@/components/layout/Container';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import {
  usePublicAboutOverview,
  usePublicCampusLifeImages,
} from '@/hooks/usePublicSettings';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface CampusItem {
  title: string;
  body: string;
}

export default function AboutPage() {
  const { t } = useTranslation();
  const grades = t('common.gradesLabel');
  const campusLife = useTranslatedList<CampusItem>('about.campusLife.items');
  const { overview } = usePublicAboutOverview(grades);
  const { images } = usePublicCampusLifeImages();
  const campusImages = [images.morning, images.friends, images.sports, images.evening] as const;
  const campusCollage = [
    ASSETS.campusTour.src,
    images.morning.src,
    ASSETS.admissionsSide.src,
    images.evening.src,
    images.friends.src,
    ASSETS.heroStudents.src,
  ] as const;

  return (
    <div className="flex w-full flex-col bg-white">
      <section id="overview" className="scroll-mt-28">
        <Container className="pt-10 pb-6 md:pt-12">
          <PageBreadcrumb current={t('nav.about')} />
          <p className="font-sans text-caption font-semibold tracking-wide text-primary uppercase">
            {t('about.hero.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-on-surface md:text-5xl">
            {overview.title}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-body-md text-on-surface-variant">
            {overview.tagline}
          </p>
          <div className="mt-6 max-w-3xl space-y-4 font-sans text-body-md leading-relaxed text-on-surface-variant">
            <p>{overview.paragraph1}</p>
            <p>{overview.paragraph2}</p>
          </div>
        </Container>
      </section>

      {/* Mission · Vision · Campus — Fasilides-style 3 columns */}
      <section id="mission-vision" className="scroll-mt-28 pb-space-2xl">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
            <article>
              <div className="overflow-hidden bg-surface-container">
                <img
                  src={ASSETS.admissionsSide.src}
                  alt={ASSETS.admissionsSide.alt}
                  className="aspect-[4/5] w-full object-cover object-[center_20%]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h2 className="mt-5 font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {overview.mission.label}
              </h2>
              <p className="mt-3 font-sans text-body-md leading-relaxed text-on-surface-variant">
                {overview.mission.body}
              </p>
              <Link
                to={`${PUBLIC_ROUTES.about}#why-study`}
                className="mt-4 inline-block font-sans text-sm font-bold text-on-surface hover:text-primary"
              >
                {t('about.readMore', { defaultValue: 'Read More' })}
              </Link>
            </article>

            <article>
              <div className="overflow-hidden bg-surface-container">
                <img
                  src={ASSETS.students.src}
                  alt={ASSETS.students.alt}
                  className="aspect-[4/5] w-full object-cover object-[center_25%]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h2 className="mt-5 font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {overview.vision.label}
              </h2>
              <p className="mt-3 font-sans text-body-md leading-relaxed text-on-surface-variant">
                {overview.vision.body}
              </p>
              <Link
                to={`${PUBLIC_ROUTES.about}#story`}
                className="mt-4 inline-block font-sans text-sm font-bold text-on-surface hover:text-primary"
              >
                {t('about.readMore', { defaultValue: 'Read More' })}
              </Link>
            </article>

            <article>
              <div className="grid grid-cols-2 gap-1.5">
                {campusCollage.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
              <h2 className="mt-5 font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {overview.campusBlock.title}
              </h2>
              <p className="mt-3 font-sans text-body-md leading-relaxed text-on-surface-variant">
                {overview.campusBlock.body}
              </p>
              <Link
                to={`${PUBLIC_ROUTES.about}#campus-life`}
                className="mt-4 inline-block font-sans text-sm font-bold text-on-surface hover:text-primary"
              >
                {t('about.readMore', { defaultValue: 'Read More' })}
              </Link>
            </article>
          </div>
        </Container>
      </section>

      {/* Stats strip */}
      <section className="bg-primary text-on-primary">
        <Container className="py-8 md:py-10">
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {overview.stats.map((stat) => (
              <li key={`${stat.value}-${stat.label}`} className="text-center sm:text-left">
                <p className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 font-sans text-caption tracking-wide text-secondary-fixed uppercase">
                  {stat.label}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="story" className="scroll-mt-28 bg-brand-ivory py-space-2xl">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="overflow-hidden lg:col-span-6">
              <img
                src={ASSETS.shapingFuture.src}
                alt={ASSETS.shapingFuture.alt}
                className="aspect-[5/6] w-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="lg:col-span-6">
              <h2 className="font-sans text-2xl font-bold tracking-wide text-on-surface uppercase">
                {t('about.shaping.title')}
              </h2>
              <p className="mt-4 font-sans text-body-lg font-light leading-relaxed text-on-surface-variant">
                {t('about.shaping.body')}
              </p>
              <p className="mt-6 font-display text-body-md italic text-primary">
                {t('about.shaping.quote')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={PUBLIC_ROUTES.admission}
                  className="inline-flex min-h-11 items-center bg-primary px-5 font-sans text-sm font-semibold text-on-primary hover:bg-primary-container"
                >
                  {t('nav.admission')}
                </Link>
                <Link
                  to={PUBLIC_ROUTES.contact}
                  className="inline-flex min-h-11 items-center bg-on-surface px-5 font-sans text-sm font-semibold text-white hover:bg-primary"
                >
                  {t('nav.contact')}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="campus-life" className="scroll-mt-28 py-space-2xl">
        <Container>
          <h2 className="text-center font-sans text-2xl font-bold tracking-wide text-on-surface uppercase">
            {t('about.campusLife.title')}
          </h2>
          <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {campusLife.map((item, index) => {
              const photo = campusImages[index] ?? campusImages[0]!;
              const isField = index === 2;
              return (
                <li
                  key={item.title}
                  id={isField ? 'action-on-the-field' : undefined}
                  className="scroll-mt-28"
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  <h3 className="mt-4 font-sans text-base font-bold text-on-surface">{item.title}</h3>
                  <p className="mt-2 font-sans text-body-sm text-on-surface-variant">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section id="why-study" className="scroll-mt-28 border-t border-outline-variant/40 bg-brand-ivory py-space-2xl">
        <Container>
          <h2 className="font-sans text-2xl font-bold tracking-wide text-on-surface uppercase">
            {t('about.whyStudy.title')}
          </h2>
          <p className="mt-4 max-w-3xl font-sans text-body-md text-on-surface-variant">
            {overview.paragraph1}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={PUBLIC_ROUTES.academics}
              className="inline-flex min-h-11 items-center bg-primary px-5 font-sans text-sm font-semibold text-on-primary"
            >
              {t('nav.academics')}
            </Link>
            <Link
              to={PUBLIC_ROUTES.admission}
              className="inline-flex min-h-11 items-center border border-on-surface px-5 font-sans text-sm font-semibold text-on-surface hover:bg-on-surface hover:text-white"
            >
              {t('nav.admission')}
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
