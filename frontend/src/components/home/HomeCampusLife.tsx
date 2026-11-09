import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { PUBLIC_ROUTES } from '@/config/routes';
import { usePublicCampusLifeImages } from '@/hooks/usePublicSettings';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface CampusItem {
  title: string;
  body: string;
}

export function HomeCampusLife() {
  const { t } = useTranslation();
  const items = useTranslatedList<CampusItem>('about.campusLife.items');
  const { images } = usePublicCampusLifeImages();
  const photos = [images.morning, images.friends, images.sports, images.evening] as const;

  return (
    <section id="campus-life" className="scroll-mt-24 bg-white py-space-2xl">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
            {t('about.campusLife.title')}
          </h2>
          <p className="mt-3 font-sans text-body-md text-on-surface-variant">
            {t('home.campusLifeIntro')}
          </p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const photo = photos[index] ?? photos[0]!;
            const isField = index === 2;
            const href = isField
              ? `${PUBLIC_ROUTES.about}#action-on-the-field`
              : `${PUBLIC_ROUTES.about}#campus-life`;
            return (
              <li
                key={item.title}
                id={isField ? 'action-on-the-field' : undefined}
                className="flex flex-col scroll-mt-24"
              >
                <Link to={href} className="group flex flex-1 flex-col">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <h3 className="mt-4 font-display text-xl font-semibold text-on-surface transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 font-sans text-body-sm leading-relaxed text-on-surface-variant">
                    {item.body}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-10 text-center">
          <Link
            to={`${PUBLIC_ROUTES.about}#campus-life`}
            className="font-sans text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t('about.campusLife.readMore')}
          </Link>
        </div>
      </Container>
    </section>
  );
}
