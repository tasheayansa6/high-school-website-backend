import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Section tone="default" className="bg-surface">
      <Container>
        <SectionHeading
          eyebrow={t('notFound.eyebrow')}
          title={t('notFound.title')}
          description={t('notFound.description')}
        />
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/"
            className="inline-flex min-h-btn-h items-center justify-center bg-primary px-8 py-3.5 font-label-caps text-label-caps uppercase tracking-widest text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            {t('notFound.returnHome')}
          </Link>
          <Link
            to="/contact"
            className="inline-flex min-h-btn-h items-center px-8 font-label-caps text-label-caps uppercase tracking-widest text-primary underline-offset-4 hover:underline"
          >
            {t('notFound.contactUs')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
