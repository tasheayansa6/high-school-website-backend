import { Award, Building2, Handshake, Users, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Container } from '@/components/layout/Container';
import { useTranslatedList } from '@/i18n/useTranslatedList';

interface StatItem {
  key: string;
  value: string;
  label: string;
}

const ICONS = {
  established: Building2,
  students: Users,
  staff: UserCheck,
  alumni: Award,
  partners: Handshake,
} as const;

/** Soft school-at-a-glance strip — people first, not a dashboard. */
export function HomeStatsBar() {
  const { t } = useTranslation();
  const items = useTranslatedList<StatItem>('home.statsBar.items');

  return (
    <section
      id="stats"
      className="scroll-mt-24 border-y border-primary/10 bg-brand-evergreen text-on-primary"
      aria-label={t('home.statsBar.ariaLabel')}
    >
      <Container className="py-9 md:py-11">
        <p className="mb-7 text-center font-sans text-sm tracking-[0.08em] text-secondary-fixed/90">
          {t('home.statsBar.intro')}
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => {
            const Icon = ICONS[item.key as keyof typeof ICONS] ?? Building2;
            return (
              <li key={item.key} className="flex flex-col items-center text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-secondary-fixed" aria-hidden />
                </span>
                <p className="font-display text-3xl font-semibold tracking-tight md:text-[2rem]">
                  {item.value}
                </p>
                <p className="mt-1.5 max-w-[9rem] font-sans text-caption leading-snug text-white/80">
                  {item.label}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
