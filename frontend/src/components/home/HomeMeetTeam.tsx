import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=480&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=480&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=480&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=480&q=80',
] as const;

export function HomeMeetTeam() {
  const { t } = useTranslation();
  const members = useTranslatedList<TeamMember>('home.team.members');

  return (
    <section className="bg-brand-ivory py-space-2xl">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
            {t('home.team.title')}
          </h2>
          <p className="mt-3 font-sans text-body-md text-on-surface-variant">
            {t('home.team.intro')}
          </p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-5 sm:mt-12 sm:gap-6 md:grid-cols-4 md:gap-8">
          {members.map((member, index) => (
            <li key={member.name} className="min-w-0 text-center">
              <div className="overflow-hidden bg-surface-container">
                <img
                  src={member.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
                  alt={member.name}
                  className="aspect-[4/5] w-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <p className="mt-3 font-display text-lg font-semibold text-on-surface">
                {member.name}
              </p>
              <p className="mt-1 line-clamp-2 font-sans text-caption text-on-surface-variant">
                {member.role}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
