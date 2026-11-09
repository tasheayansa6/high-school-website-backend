import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';

const CARDS = [
  {
    key: 'admission',
    href: PUBLIC_ROUTES.admission,
    video: ASSETS.admissionsHeroVideo,
  },
  {
    key: 'social',
    href: `${PUBLIC_ROUTES.academics}#streams`,
    image: ASSETS.campus.friends.src,
  },
  {
    key: 'natural',
    href: `${PUBLIC_ROUTES.academics}#streams`,
    image: ASSETS.subjects.chemistry,
  },
] as const;

export function HomeAdmissionStreams() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-space-2xl">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
            {t('home.admissionSection.title')}
          </h2>
          <p className="mt-4 font-sans text-body-md leading-relaxed text-on-surface-variant">
            {t('home.admissionSection.body')}
          </p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((card) => (
            <li key={card.key}>
              <Link to={card.href} className="group relative block overflow-hidden">
                {'video' in card ? (
                  <video
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={card.video.poster}
                    aria-label={card.video.alt}
                  >
                    <source src={card.video.src} type="video/webm" />
                  </video>
                ) : (
                  <img
                    src={card.image}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-evergreen/90 to-transparent px-4 pt-16 pb-4">
                  <p className="font-sans text-base font-bold text-white">
                    {t(`home.admissionSection.cards.${card.key}`)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
