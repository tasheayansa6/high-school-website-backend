import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { ASSETS } from '@/config/assets';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface Commitment {
  title: string;
  body: string;
}

/** Warm “Shaping the Future” story — classroom life beside quiet promises. */
export function HomeShapingFuture() {
  const { t } = useTranslation();
  const commitments = useTranslatedList<Commitment>('about.shaping.commitments');

  return (
    <section id="shaping" className="scroll-mt-24 bg-brand-ivory py-space-2xl">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="relative overflow-hidden lg:col-span-5">
            <img
              src={ASSETS.shapingFuture.src}
              alt={ASSETS.shapingFuture.alt}
              className="aspect-[4/5] w-full object-cover object-[center_22%]"
              loading="lazy"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-evergreen/25 via-transparent to-transparent"
              aria-hidden
            />
          </div>

          <div className="lg:col-span-7">
            <p className="font-sans text-sm tracking-[0.12em] text-secondary uppercase">
              {t('about.shaping.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
              {t('about.shaping.title')}
            </h2>
            <p className="mt-5 max-w-xl font-sans text-body-md leading-relaxed text-on-surface-variant md:text-body-lg">
              {t('about.shaping.body')}
            </p>

            <h3 className="mt-9 font-sans text-sm font-semibold tracking-wide text-primary">
              {t('about.shaping.commitmentTitle')}
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {commitments.map((item) => (
                <li key={item.title} className="border-l-2 border-secondary/70 pl-4">
                  <p className="font-sans text-sm font-semibold text-on-surface">{item.title}</p>
                  <p className="mt-1 font-sans text-body-sm leading-relaxed text-on-surface-variant">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-10 max-w-lg font-display text-lg leading-snug text-primary italic md:text-xl">
              {t('about.shaping.quote')}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
