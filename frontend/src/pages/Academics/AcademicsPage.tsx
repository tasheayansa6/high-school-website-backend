import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AmharicAlphabetBook } from '@/components/academics/AmharicAlphabetBook';
import { Container } from '@/components/layout/Container';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { LoadingState } from '@/components/ui/LoadingState';
import { PUBLIC_ROUTES } from '@/config/routes';
import { usePublicAcademicOverview } from '@/hooks/usePublicAcademic';
import { useTranslatedList } from '@/i18n/useTranslatedList';

const SIDEBAR = [
  { id: 'overview', labelKey: 'academicsPage.nav.overview' },
  { id: 'outcomes', labelKey: 'academicsPage.nav.outcomes' },
  { id: 'programs', labelKey: 'academicsPage.nav.programs' },
  { id: 'amharic', labelKey: 'academicsPage.nav.amharic' },
  { id: 'streams', labelKey: 'academicsPage.nav.streams' },
  { id: 'entry', labelKey: 'academicsPage.nav.entry' },
  { id: 'apply', labelKey: 'academicsPage.nav.apply' },
] as const;

export default function AcademicsPage() {
  const { t } = useTranslation();
  const grades = t('common.gradesLabel');
  const outcomes = useTranslatedList<string>('academicsPage.outcomes');
  const grade9Subjects = useTranslatedList<string>('academicsPage.grade9Subjects');
  const naturalSubjects = useTranslatedList<string>('academicsPage.naturalSubjects');
  const socialSubjects = useTranslatedList<string>('academicsPage.socialSubjects');
  const pathways = useTranslatedList<string>('academicsPage.pathways');
  const academicQuery = usePublicAcademicOverview();
  const apiSubjects = academicQuery.data?.subjects ?? [];

  return (
    <div className="bg-white">
      <Container className="pt-10 pb-6 md:pt-12">
        <PageBreadcrumb current={t('nav.academics')} />
        <h1 className="font-display text-4xl font-semibold tracking-tight text-on-surface md:text-5xl">
          {t('academicsPage.title', { defaultValue: 'Major & Program' })}
        </h1>
      </Container>

      <Container className="pb-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Mobile section jump links — desktop keeps a static sidebar */}
          <nav
            className="lg:hidden"
            aria-label={t('academicsPage.title', { defaultValue: 'Major & Program' })}
          >
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SIDEBAR.map((item) => (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-outline-variant/60 bg-white px-3.5 font-sans text-caption font-semibold text-on-surface whitespace-nowrap hover:border-primary hover:text-primary"
                  >
                    {t(item.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-14 lg:col-span-8">
            <section id="overview" className="scroll-mt-28">
              <h2 className="font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.overview.title')}
              </h2>
              <div className="mt-4 space-y-4 font-sans text-body-md leading-relaxed text-on-surface-variant">
                <p>{t('academicsPage.overview.p1', { grades })}</p>
                <p>{t('academicsPage.overview.p2')}</p>
              </div>
            </section>

            <section id="outcomes" className="scroll-mt-28">
              <h2 className="font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.outcomesTitle')}
              </h2>
              <ul className="mt-5 space-y-3">
                {outcomes.map((item) => (
                  <li key={item} className="flex gap-3 font-sans text-body-md text-on-surface">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section id="programs" className="scroll-mt-28">
              <h2 className="font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.programs.title')}
              </h2>
              <h3 className="mt-5 font-sans text-base font-semibold text-on-surface">
                {t('academicsPage.programs.secondaryTitle')}
              </h3>
              <p className="mt-2 font-sans text-body-md text-on-surface-variant">
                {t('academicsPage.programs.secondaryBody')}
              </p>
              <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
                {(apiSubjects.length > 0
                  ? apiSubjects.map((s) => s.name)
                  : grade9Subjects
                ).map((name) => (
                  <li key={name} className="font-sans text-body-sm text-on-surface before:mr-2 before:content-['•']">
                    {name}
                  </li>
                ))}
              </ul>
              {academicQuery.isLoading ? (
                <div className="mt-4">
                  <LoadingState message={t('common.loading')} />
                </div>
              ) : null}
            </section>

            <section id="amharic" className="scroll-mt-28">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
                {t('academicsPage.amharic.title')}
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-body-md leading-relaxed text-on-surface-variant">
                {t('academicsPage.amharic.body')}
              </p>
              <div className="mt-8">
                <AmharicAlphabetBook />
              </div>
            </section>

            <section id="streams" className="scroll-mt-28">
              <h2 className="font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.streams.title')}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <h3 className="font-sans text-base font-semibold text-on-surface">
                    {t('academicsPage.streams.naturalTitle')}
                  </h3>
                  <p className="mt-2 font-sans text-body-sm text-on-surface-variant">
                    {t('academicsPage.streams.naturalBody')}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {naturalSubjects.map((s) => (
                      <li key={s} className="font-sans text-body-sm text-on-surface before:mr-2 before:content-['•']">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-sans text-base font-semibold text-on-surface">
                    {t('academicsPage.streams.socialTitle')}
                  </h3>
                  <p className="mt-2 font-sans text-body-sm text-on-surface-variant">
                    {t('academicsPage.streams.socialBody')}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {socialSubjects.map((s) => (
                      <li key={s} className="font-sans text-body-sm text-on-surface before:mr-2 before:content-['•']">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <h3 className="mt-8 font-sans text-base font-semibold text-on-surface">
                {t('academicsPage.pathwaysTitle')}
              </h3>
              <ul className="mt-3 space-y-1">
                {pathways.map((p) => (
                  <li key={p} className="font-sans text-body-sm text-on-surface before:mr-2 before:content-['•']">
                    {p}
                  </li>
                ))}
              </ul>
            </section>

            <section id="entry" className="scroll-mt-28">
              <h2 className="font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.entry.title')}
              </h2>
              <h3 className="mt-5 font-sans text-base font-semibold text-on-surface">
                {t('academicsPage.entry.grade9Title')}
              </h3>
              <ul className="mt-2 space-y-1 font-sans text-body-md text-on-surface-variant">
                <li>• {t('academicsPage.entry.grade9a')}</li>
                <li>• {t('academicsPage.entry.grade9b')}</li>
              </ul>
              <h3 className="mt-5 font-sans text-base font-semibold text-on-surface">
                {t('academicsPage.entry.grade11Title')}
              </h3>
              <ul className="mt-2 space-y-1 font-sans text-body-md text-on-surface-variant">
                <li>• {t('academicsPage.entry.grade11a')}</li>
                <li>• {t('academicsPage.entry.grade11b')}</li>
                <li>• {t('academicsPage.entry.grade11c')}</li>
              </ul>
            </section>

            <section id="apply" className="scroll-mt-28">
              <h2 className="font-sans text-lg font-bold tracking-wide text-on-surface uppercase">
                {t('academicsPage.apply.title')}
              </h2>
              <p className="mt-3 font-sans text-body-md text-on-surface-variant">
                {t('academicsPage.apply.body')}
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 font-sans text-body-md text-on-surface">
                <li>{t('academicsPage.apply.step1')}</li>
                <li>{t('academicsPage.apply.step2')}</li>
                <li>{t('academicsPage.apply.step3')}</li>
                <li>{t('academicsPage.apply.step4')}</li>
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={PUBLIC_ROUTES.admission}
                  className="inline-flex min-h-11 items-center bg-primary px-6 font-sans text-sm font-semibold text-on-primary hover:bg-primary-container"
                >
                  {t('academicsPage.apply.cta', { defaultValue: 'Apply Now' })}
                </Link>
                <Link
                  to={PUBLIC_ROUTES.contact}
                  className="inline-flex min-h-11 items-center bg-on-surface px-6 font-sans text-sm font-semibold text-white hover:bg-primary"
                >
                  {t('nav.contact')}
                </Link>
              </div>
            </section>
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="border border-outline-variant/50 bg-white p-5">
              <ul className="divide-y divide-outline-variant/40">
                {SIDEBAR.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block py-3 font-sans text-sm text-on-surface transition-colors hover:text-primary"
                    >
                      {t(item.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                to={PUBLIC_ROUTES.admission}
                className="mt-4 inline-flex w-full min-h-11 items-center justify-center bg-primary font-sans text-sm font-semibold text-on-primary hover:bg-primary-container"
              >
                {t('academicsPage.apply.cta', { defaultValue: 'Apply Now' })}
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
