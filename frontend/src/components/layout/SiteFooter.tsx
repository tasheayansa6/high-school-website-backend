import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { NewsletterSubscribeForm } from '@/components/forms/NewsletterSubscribeForm';
import { NavigationLink } from '@/components/ui/NavigationLink';
import { PUBLIC_ROUTES, contentPagePath } from '@/config/routes';
import { SITE } from '@/config/site';
import { usePublicContact } from '@/hooks/usePublicSettings';

const RESOURCE_LINKS = [
  { labelKey: 'home' as const, path: PUBLIC_ROUTES.home, end: true },
  { labelKey: 'about' as const, path: PUBLIC_ROUTES.about },
  { labelKey: 'academics' as const, path: PUBLIC_ROUTES.academics },
  { labelKey: 'admission' as const, path: PUBLIC_ROUTES.admission },
] as const;

const SUPPORT_LINKS = [
  { labelKey: 'events' as const, path: PUBLIC_ROUTES.events },
  { labelKey: 'news' as const, path: PUBLIC_ROUTES.news },
  { labelKey: 'contact' as const, path: PUBLIC_ROUTES.contact },
] as const;

export function SiteFooter() {
  const { t } = useTranslation();
  const { contact, social, general, identity } = usePublicContact();

  const supportEmail = contact.email ?? contact.admissionsEmail ?? SITE.contact.admissionsEmail;
  const phone = contact.phone ?? contact.admissionsPhone ?? SITE.contact.phone;
  const address = contact.address ?? SITE.contact.address;
  const year = new Date().getFullYear();
  const socialLinks = [
    { label: 'Facebook', href: social.facebook },
    { label: 'X', href: social.twitter },
    { label: 'Instagram', href: social.instagram },
    { label: 'YouTube', href: social.youtube },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  return (
    <footer className="w-full border-t border-outline-variant/40 bg-white pb-[env(safe-area-inset-bottom)] text-on-surface">
      <div className="mx-auto max-w-7xl px-margin-mobile pt-12 pb-8 sm:pt-14 sm:pb-10 md:px-margin">
        <div className="grid grid-cols-1 gap-10 border-b border-outline-variant/40 pb-10 sm:grid-cols-2 sm:pb-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to={PUBLIC_ROUTES.home} className="mb-4 inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-secondary">
                A
              </span>
              <span>
                <span className="block font-display text-lg text-primary">{t('common.siteName')}</span>
                <span className="block font-sans text-caption text-on-surface-variant">
                  {identity.tagline ?? t('footer.brandTagline')}
                </span>
              </span>
            </Link>
            <ul className="mt-4 space-y-1.5 font-sans text-body-sm text-on-surface-variant">
              {phone ? <li>{phone}</li> : null}
              {address ? <li>{address}</li> : <li>{t('common.locationLine')}</li>}
              {supportEmail ? (
                <li>
                  <a href={`mailto:${supportEmail}`} className="hover:text-primary hover:underline">
                    {supportEmail}
                  </a>
                </li>
              ) : null}
            </ul>
            {socialLinks.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-sans text-body-sm">
                {socialLinks.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-on-surface-variant hover:text-primary"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-4 font-sans text-sm font-bold tracking-wide text-on-surface uppercase">
              {t('footer.columns.resources', { defaultValue: 'Resources' })}
            </h2>
            <ul className="space-y-2.5">
              {RESOURCE_LINKS.map((item) => (
                <li key={item.path}>
                  <NavigationLink
                    to={item.path}
                    variant="footer"
                    className="!text-on-surface-variant hover:!text-primary"
                    {...('end' in item && item.end ? { end: true } : {})}
                  >
                    {t(`nav.${item.labelKey}`)}
                  </NavigationLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-4 font-sans text-sm font-bold tracking-wide text-on-surface uppercase">
              {t('footer.columns.support', { defaultValue: 'Support' })}
            </h2>
            <ul className="space-y-2.5">
              {SUPPORT_LINKS.map((item) => (
                <li key={item.path}>
                  <NavigationLink
                    to={item.path}
                    variant="footer"
                    className="!text-on-surface-variant hover:!text-primary"
                  >
                    {t(`nav.${item.labelKey}`)}
                  </NavigationLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <NewsletterSubscribeForm variant="footer" />
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 pt-8 font-sans text-caption text-on-surface-variant md:flex-row md:items-center">
          <p>
            {general.copyright ??
              t('footer.copyright', {
                year,
                location: t('common.locationLine'),
              })}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <NavigationLink
                to={contentPagePath('privacy-policy')}
                variant="footer"
                className="!text-on-surface-variant hover:!text-primary"
              >
                {t('footer.legal.privacy')}
              </NavigationLink>
            </li>
            <li>
              <NavigationLink
                to={contentPagePath('terms-of-service')}
                variant="footer"
                className="!text-on-surface-variant hover:!text-primary"
              >
                {t('footer.legal.terms')}
              </NavigationLink>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
