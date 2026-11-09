import { useTranslation } from 'react-i18next';

import { ASSETS } from '@/config/assets';

/** Quiet campus voice — quote over atmosphere, not a heavy promo box. */
export function HomeCommunityBanner() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      <img
        src={ASSETS.campus.friends.src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        loading="lazy"
        aria-hidden
      />
      <div className="absolute inset-0 bg-brand-evergreen/78" aria-hidden />
      <div className="relative mx-auto flex min-h-[16rem] max-w-3xl items-center justify-center px-6 py-14 md:min-h-[18rem] md:py-16">
        <blockquote className="text-center">
          <p className="font-display text-xl leading-relaxed text-white md:text-2xl md:leading-snug">
            {t('home.community.quote')}
          </p>
          <footer className="mt-6 font-sans text-sm text-secondary-fixed">
            {t('home.community.attribution')}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
