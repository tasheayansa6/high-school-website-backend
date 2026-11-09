import { Check, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AdmissionInquiryForm } from '@/components/forms/AdmissionInquiryForm';
import { Container } from '@/components/layout/Container';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import { usePublicContact } from '@/hooks/usePublicSettings';
import { useTranslatedList } from '@/i18n/useTranslatedList';
import { cn } from '@/lib/utils';

interface ProcessStep {
  title: string;
  body: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface NeedItem {
  text: string;
}

function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <li key={item.question} className="border border-outline-variant/50 bg-white">
            <button
              type="button"
              className="flex w-full items-start gap-3 px-4 py-4 text-left"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-primary">
                {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
              <span className="font-sans text-sm font-bold text-on-surface">{item.question}</span>
            </button>
            <div
              className={cn(
                'overflow-hidden border-t border-outline-variant/40 px-4 transition-[max-height,padding]',
                open ? 'max-h-96 py-4' : 'max-h-0 border-t-0 py-0',
              )}
            >
              <p className="pl-8 font-sans text-body-sm leading-relaxed text-on-surface-variant">
                {item.answer}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Public Admission page — Fasilides-style layout + real inquiry form (backend).
 */
export default function RegisterPage() {
  const { t } = useTranslation();
  const { contact } = usePublicContact();
  const grades = t('common.gradesLabel');
  const steps = useTranslatedList<ProcessStep>('admissionPage.process');
  const faqLeft = useTranslatedList<FaqItem>('admissionPage.faqLeft');
  const faqRight = useTranslatedList<FaqItem>('admissionPage.faqRight');
  const needs = useTranslatedList<NeedItem>('admissionPage.needs');

  const admissionsEmail =
    contact.admissionsEmail ?? contact.email ?? SITE.contact.admissionsEmail;
  const admissionsPhone =
    contact.admissionsPhone ?? contact.phone ?? SITE.contact.phone;
  const admissionsInstructions = contact.admissionsInstructions;

  return (
    <div className="bg-white text-on-surface">
      <Container className="pt-10 pb-6 md:pt-12">
        <PageBreadcrumb current={t('nav.admission')} />
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {t('nav.admission')}
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-body-md text-on-surface-variant">
          {t('register.banner.description', { grades })}
        </p>
      </Container>

      {/* Wide campus hero — drone video */}
      <Container className="pb-8 sm:pb-10">
        <div className="overflow-hidden bg-surface-container">
          <video
            className="aspect-[16/9] max-h-[16rem] w-full object-cover sm:aspect-[21/9] sm:max-h-[22rem] md:max-h-[26rem]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={ASSETS.admissionsHeroVideo.poster}
            aria-label={ASSETS.admissionsHeroVideo.alt}
          >
            <source src={ASSETS.admissionsHeroVideo.src} type="video/webm" />
          </video>
        </div>
      </Container>

      {/* Detail about how to apply */}
      <section className="pb-14">
        <Container>
          <h2 className="font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
            {t('admissionPage.howToApplyTitle')}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-8 font-sans text-body-md leading-relaxed text-on-surface-variant md:grid-cols-2">
            <p>{t('admissionPage.howToApply.p1', { grades })}</p>
            <p>{t('admissionPage.howToApply.p2')}</p>
          </div>
        </Container>
      </section>

      {/* FAQ accordion */}
      <section className="bg-surface-container-low py-14">
        <Container>
          <h2 className="mb-8 font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
            {t('admissionPage.faqTitle')}
          </h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FaqAccordion items={faqLeft} />
            <FaqAccordion items={faqRight} />
          </div>
        </Container>
      </section>

      {/* 6-step process */}
      <section className="py-14">
        <Container>
          <h2 className="font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
            {t('admissionPage.processTitle')}
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 border border-outline-variant/50 bg-white p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant font-sans text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-sans text-sm font-bold text-on-surface">{step.title}</h3>
                  <p className="mt-1.5 font-sans text-body-sm text-on-surface-variant">{step.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Things to know + Where to apply */}
      <section className="border-t border-outline-variant/40 bg-brand-ivory py-14">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
                {t('admissionPage.thingsTitle')}
              </h2>
              <p className="mt-4 font-sans text-body-md text-on-surface-variant">
                {t('admissionPage.thingsBody')}
              </p>
              <p className="mt-5 font-sans text-sm font-bold text-on-surface">
                {t('admissionPage.youWillNeed')}
              </p>
              <ul className="mt-3 space-y-2.5">
                {needs.map((item) => (
                  <li key={item.text} className="flex gap-2.5 font-sans text-body-sm text-on-surface">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {item.text}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#inquiry"
                  className="inline-flex min-h-11 items-center bg-primary px-5 font-sans text-sm font-semibold text-on-primary hover:bg-primary-container"
                >
                  {t('admissionPage.applyNow')}
                </a>
                <Link
                  to={PUBLIC_ROUTES.contact}
                  className="inline-flex min-h-11 items-center bg-on-surface px-5 font-sans text-sm font-semibold text-white hover:bg-primary"
                >
                  {t('nav.contact')}
                </Link>
              </div>
            </div>
            <div>
              <h2 className="font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
                {t('admissionPage.whereTitle')}
              </h2>
              <div className="mt-4 overflow-hidden bg-surface-container">
                <img
                  src={ASSETS.campusTour.src}
                  alt={ASSETS.campusTour.alt}
                  className="aspect-[16/11] w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Inquiry form — backend POST /admissions/inquiries */}
      <section id="inquiry" className="scroll-mt-24 bg-white py-14">
        <Container>
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-sans text-xl font-bold tracking-wide text-on-surface uppercase">
              {t('register.formTitle')}
            </h2>
            <p className="mt-2 text-center font-sans text-body-sm text-on-surface-variant">
              {admissionsInstructions ?? t('register.formSubtitle', { grades })}
            </p>
            {admissionsEmail || admissionsPhone ? (
              <p className="mt-3 text-center font-sans text-body-sm text-on-surface-variant">
                {admissionsEmail ? (
                  <a
                    href={`mailto:${admissionsEmail}`}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {admissionsEmail}
                  </a>
                ) : null}
                {admissionsEmail && admissionsPhone ? (
                  <span className="mx-2 text-outline-variant" aria-hidden>
                    ·
                  </span>
                ) : null}
                {admissionsPhone ? <span>{admissionsPhone}</span> : null}
              </p>
            ) : null}
            <div className="mt-8 rounded-2xl border border-outline-variant/40 bg-brand-ivory/60 p-4 sm:p-6 md:p-8">
              <AdmissionInquiryForm variant="glass" />
            </div>
            <p className="mt-6 text-center font-sans text-caption text-on-surface-variant">
              {t('register.help')}{' '}
              <Link
                to={PUBLIC_ROUTES.contact}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t('nav.contact')}
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
