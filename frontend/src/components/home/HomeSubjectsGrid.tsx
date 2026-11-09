import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import { usePublicAmharicBook } from '@/hooks/usePublicSettings';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface SubjectItem {
  name: string;
  note: string;
}

/** Subject mosaic — curious, approachable, not catalogue-like. */
export function HomeSubjectsGrid() {
  const { t } = useTranslation();
  const subjects = useTranslatedList<SubjectItem>('about.subjects.items');
  const { book } = usePublicAmharicBook();
  const subjectImages = [
    book.coverUrl,
    ASSETS.subjects.english,
    ASSETS.subjects.mathematics,
    ASSETS.subjects.physics,
    ASSETS.subjects.chemistry,
    ASSETS.subjects.biology,
    ASSETS.subjects.geography,
    ASSETS.subjects.it,
  ] as const;

  return (
    <section id="subjects" className="scroll-mt-24 bg-white py-space-2xl">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
            {t('home.subjectsSection.title')}
          </h2>
          <p className="mt-3 font-sans text-body-md text-on-surface-variant">
            {t('home.subjectsSection.intro')}
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((subject, index) => {
            const image = subjectImages[index % subjectImages.length];
            const href =
              index === 0
                ? `${PUBLIC_ROUTES.academics}#amharic`
                : PUBLIC_ROUTES.academics;
            return (
              <li key={subject.name}>
                <Link to={href} className="group block">
                  <div className="relative aspect-[5/4] overflow-hidden bg-surface-container">
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-brand-evergreen/80 via-brand-evergreen/15 to-transparent"
                      aria-hidden
                    />
                    <p className="absolute bottom-3 left-3 font-display text-xl font-semibold text-white">
                      {subject.name}
                    </p>
                  </div>
                  <p className="mt-2.5 font-sans text-body-sm text-on-surface-variant transition-colors group-hover:text-primary">
                    {subject.note}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
