import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ContactMessageForm } from '@/components/forms/ContactMessageForm';
import { Container } from '@/components/layout/Container';
import { PUBLIC_ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import { usePublicContact } from '@/hooks/usePublicSettings';

export default function ContactPage() {
  const { t } = useTranslation();
  const { contact } = usePublicContact();

  const email = contact.admissionsEmail ?? contact.email ?? SITE.contact.admissionsEmail;
  const phone = contact.admissionsPhone ?? contact.phone ?? SITE.contact.phone;
  const address = contact.address ?? SITE.contact.address;
  const showContact = [email, phone, address].some(Boolean);

  return (
    <div className="flex w-full flex-col bg-brand-ivory">
      <section className="bg-primary text-on-primary">
        <Container className="py-14 md:py-16">
          <p className="mb-3 font-sans text-sm tracking-[0.14em] text-secondary-fixed uppercase">
            {t('contact.banner.eyebrow')}
          </p>
          <h1 className="max-w-3xl font-display text-display-hero tracking-tight md:text-[3rem]">
            {t('contact.banner.title')}
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-body-lg font-light text-surface-container-highest">
            {t('contact.banner.description')}
          </p>
        </Container>
      </section>

      <section className="py-space-2xl">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 className="font-display text-headline-md text-primary">
                {t('contact.info.title')}
              </h2>
              <p className="mt-3 font-sans text-body-md leading-relaxed text-on-surface-variant">
                {t('contact.info.description')}
              </p>

              {showContact ? (
                <dl className="mt-10 space-y-7 border-t border-outline-variant/50 pt-8">
                  {email ? (
                    <div>
                      <dt className="font-sans text-caption tracking-wide text-secondary uppercase">
                        {t('contact.info.email')}
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={`mailto:${email}`}
                          className="font-sans text-body-lg text-primary underline-offset-4 hover:underline"
                        >
                          {email}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {phone ? (
                    <div>
                      <dt className="font-sans text-caption tracking-wide text-secondary uppercase">
                        {t('contact.info.admissionsOffice')}
                      </dt>
                      <dd className="mt-1 font-sans text-body-lg text-primary">{phone}</dd>
                    </div>
                  ) : null}
                  {address ? (
                    <div>
                      <dt className="font-sans text-caption tracking-wide text-secondary uppercase">
                        {t('contact.info.address')}
                      </dt>
                      <dd className="mt-1 font-sans text-body-lg text-primary">{address}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-8 font-sans text-body-md text-on-surface-variant">
                  <Trans
                    i18nKey="contact.info.pending"
                    values={{ location: t('common.locationLine') }}
                    components={{ code: <code className="text-body-sm" /> }}
                  />
                </p>
              )}

              {contact.admissionsInstructions ? (
                <p className="mt-6 font-sans text-body-md text-on-surface-variant">
                  {contact.admissionsInstructions}
                </p>
              ) : null}

              <div className="mt-10 border-t border-outline-variant/50 pt-8">
                <h3 className="font-display text-headline-sm text-primary">
                  {t('contact.visit.title')}
                </h3>
                <p className="mt-2 font-sans text-body-md text-on-surface-variant">
                  {t('contact.visit.body')}
                </p>
                <Link
                  to={PUBLIC_ROUTES.register}
                  className="mt-4 inline-flex font-sans text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t('contact.visit.cta')} →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <h2 className="font-display text-headline-sm text-primary">
                {t('contact.form.title')}
              </h2>
              <div className="mt-6">
                <ContactMessageForm />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
