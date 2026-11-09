import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { useSubscribeNewsletter } from '@/hooks/useNewsletter';
import { getErrorMessage } from '@/utils/apiMessage';
import { cn } from '@/utils/cn';
import { applyApiFieldErrors } from '@/utils/formErrors';
import {
  type NewsletterSubscribeFormValues,
  newsletterSubscribeSchema,
} from '@/validation/newsletter.schema';

type NewsletterVariant = 'footer' | 'page';

interface NewsletterSubscribeFormProps {
  variant?: NewsletterVariant;
  className?: string;
}

export function NewsletterSubscribeForm({
  variant = 'footer',
  className,
}: NewsletterSubscribeFormProps) {
  const { t } = useTranslation();
  const subscribeMutation = useSubscribeNewsletter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const emailId = variant === 'footer' ? 'footer-newsletter-email' : 'page-newsletter-email';
  const labelKey = 'footer.newsletter.emailLabel';
  const placeholderKey = 'footer.newsletter.emailPlaceholder';
  const submitKey = 'footer.newsletter.subscribe';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterSubscribeFormValues>({
    resolver: zodResolver(newsletterSubscribeSchema),
    defaultValues: { email: '' },
  });

  const busy = isSubmitting || subscribeMutation.isPending;

  const onSubmit = handleSubmit(async (raw) => {
    setSuccessMessage(null);
    setFormError(null);
    const body = newsletterSubscribeSchema.parse(raw);

    try {
      const response = await subscribeMutation.mutateAsync(body);
      setSuccessMessage(response.message);
      reset({ email: '' });
    } catch (error) {
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) {
        setFormError(getErrorMessage(error, t('forms.newsletter.submitFailed')));
      }
    }
  });

  if (variant === 'footer') {
    return (
      <div className={cn('flex w-full flex-col gap-3 md:max-w-md', className)}>
        <div>
          <h2 className="font-display text-headline-sm text-on-primary">
            {t('footer.newsletter.title')}
          </h2>
          <p className="mt-1 font-sans text-body-sm text-surface-container-highest">
            {t('footer.newsletter.blurb')}
          </p>
        </div>
        <form
          className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={onSubmit}
          noValidate
        >
          <label className="sr-only" htmlFor={emailId}>
            {t(labelKey)}
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder={t(placeholderKey)}
            disabled={busy}
            aria-invalid={Boolean(errors.email)}
            className={cn(
              'min-h-control-h w-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 font-sans text-body-sm text-on-surface',
              errors.email && 'ring-1 ring-error',
            )}
            {...register('email')}
          />
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
            className="min-h-control-h whitespace-nowrap bg-secondary px-6 py-2.5 font-label-caps text-label-caps uppercase tracking-wider text-on-secondary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? t('common.pleaseWait') : t(submitKey)}
          </button>
        </form>
        {errors.email?.message ? (
          <p role="alert" className="font-sans text-caption text-error">
            {errors.email.message}
          </p>
        ) : null}
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? (
          <FormAlert tone="success">
            <p>{successMessage}</p>
            <p className="mt-1">{t('forms.newsletter.confirmHint')}</p>
          </FormAlert>
        ) : (
          <p className="font-sans text-caption text-secondary-fixed">
            {t('footer.newsletter.notice')}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className={cn('flex flex-col gap-3', className)} onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <FormField
          id={emailId}
          label={t(labelKey)}
          className="flex-1 text-left"
          error={errors.email?.message}
        >
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder={t(placeholderKey)}
            hasError={Boolean(errors.email)}
            aria-invalid={Boolean(errors.email)}
            disabled={busy}
            {...register('email')}
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="sm:self-end"
          isLoading={busy}
          disabled={busy}
        >
          {t(submitKey)}
        </Button>
      </div>
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      {successMessage ? (
        <FormAlert tone="success">
          <p>{successMessage}</p>
          <p className="mt-1">{t('forms.newsletter.confirmHint')}</p>
        </FormAlert>
      ) : null}
    </form>
  );
}
