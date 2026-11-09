import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, CalendarDays, Mail, MessageSquare, Phone, User, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { useSubmitAdmissionInquiry } from '@/hooks/useAdmissions';
import { useSubscribeNewsletter } from '@/hooks/useNewsletter';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import {
  type AdmissionInquiryFormValues,
  admissionInquirySchema,
  DEFAULT_ACADEMIC_YEAR,
} from '@/validation/admissions.schema';

type NewsletterFollowUp =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | { status: 'skipped' };

interface AdmissionInquiryFormProps {
  /** `glass` = pill inputs for the Register page reference layout. */
  variant?: 'default' | 'glass';
}

function GlassField({
  icon,
  children,
  error,
}: {
  icon: ReactNode;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-3 rounded-full border bg-white/80 px-4 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15',
          error ? 'border-error/60' : 'border-outline-variant/50',
        )}
      >
        <span className="shrink-0 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error ? <p className="mt-1.5 px-4 font-sans text-caption text-error">{error}</p> : null}
    </div>
  );
}

export function AdmissionInquiryForm({ variant = 'default' }: AdmissionInquiryFormProps) {
  const { t } = useTranslation();
  const admissionsMutation = useSubmitAdmissionInquiry();
  const newsletterMutation = useSubscribeNewsletter();
  const [admissionMessage, setAdmissionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newsletterFollowUp, setNewsletterFollowUp] = useState<NewsletterFollowUp>({
    status: 'idle',
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdmissionInquiryFormValues>({
    resolver: zodResolver(admissionInquirySchema),
    defaultValues: {
      studentName: '',
      guardianName: '',
      email: '',
      phone: '',
      gradeApplyingFor: '',
      academicYear: DEFAULT_ACADEMIC_YEAR,
      message: '',
      subscribeNewsletter: true,
    },
  });

  const busy = isSubmitting || admissionsMutation.isPending || newsletterMutation.isPending;

  const clearForm = () => {
    reset({
      studentName: '',
      guardianName: '',
      email: '',
      phone: '',
      gradeApplyingFor: '',
      academicYear: DEFAULT_ACADEMIC_YEAR,
      message: '',
      subscribeNewsletter: true,
    });
    setAdmissionMessage(null);
    setFormError(null);
    setNewsletterFollowUp({ status: 'idle' });
  };

  const onSubmit = handleSubmit(async (raw) => {
    setAdmissionMessage(null);
    setFormError(null);
    setNewsletterFollowUp({ status: 'idle' });

    const parsed = admissionInquirySchema.parse(raw);
    const { subscribeNewsletter, ...inquiry } = parsed;

    try {
      const response = await admissionsMutation.mutateAsync(inquiry);
      const successMessage = response.message;

      reset({
        studentName: '',
        guardianName: '',
        email: '',
        phone: '',
        gradeApplyingFor: '',
        academicYear: DEFAULT_ACADEMIC_YEAR,
        message: '',
        subscribeNewsletter: true,
      });
      setFormError(null);
      setAdmissionMessage(successMessage);

      if (!subscribeNewsletter) {
        setNewsletterFollowUp({ status: 'skipped' });
        return;
      }

      try {
        const newsletterResponse = await newsletterMutation.mutateAsync({
          email: inquiry.email,
        });
        setNewsletterFollowUp({
          status: 'success',
          message: newsletterResponse.message,
        });
      } catch (newsletterError) {
        setNewsletterFollowUp({
          status: 'error',
          message: getErrorMessage(newsletterError, t('forms.newsletter.followUpFailed')),
        });
      }
    } catch (error) {
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) {
        setFormError(getErrorMessage(error, t('forms.admissions.submitFailed')));
      }
      setNewsletterFollowUp({ status: 'skipped' });
    }
  });

  const pillInputClass =
    'h-12 w-full min-w-0 border-0 bg-transparent px-0 font-sans text-base text-on-surface shadow-none placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-0 disabled:opacity-60 sm:text-sm';

  if (variant === 'glass') {
    return (
      <form className="space-y-3.5" onSubmit={onSubmit} noValidate>
        <GlassField
          icon={<User className="h-5 w-5" aria-hidden />}
          {...(errors.studentName?.message ? { error: errors.studentName.message } : {})}
        >
          <input
            id="student-name"
            autoComplete="name"
            disabled={busy}
            placeholder={t('home.inquiry.form.studentName')}
            aria-invalid={Boolean(errors.studentName)}
            className={pillInputClass}
            {...register('studentName')}
          />
        </GlassField>

        <GlassField
          icon={<Users className="h-5 w-5" aria-hidden />}
          {...(errors.guardianName?.message ? { error: errors.guardianName.message } : {})}
        >
          <input
            id="guardian-name"
            autoComplete="name"
            disabled={busy}
            placeholder={t('home.inquiry.form.guardianName')}
            aria-invalid={Boolean(errors.guardianName)}
            className={pillInputClass}
            {...register('guardianName')}
          />
        </GlassField>

        <GlassField
          icon={<Mail className="h-5 w-5" aria-hidden />}
          {...(errors.email?.message ? { error: errors.email.message } : {})}
        >
          <input
            id="guardian-email"
            type="email"
            autoComplete="email"
            disabled={busy}
            placeholder={t('home.inquiry.form.email')}
            aria-invalid={Boolean(errors.email)}
            className={pillInputClass}
            {...register('email')}
          />
        </GlassField>

        <GlassField
          icon={<Phone className="h-5 w-5" aria-hidden />}
          {...(errors.phone?.message ? { error: errors.phone.message } : {})}
        >
          <input
            id="guardian-phone"
            type="tel"
            autoComplete="tel"
            disabled={busy}
            placeholder={t('home.inquiry.form.phone')}
            aria-invalid={Boolean(errors.phone)}
            className={pillInputClass}
            {...register('phone')}
          />
        </GlassField>

        <GlassField
          icon={<BookOpen className="h-5 w-5" aria-hidden />}
          {...(errors.gradeApplyingFor?.message
            ? { error: errors.gradeApplyingFor.message }
            : {})}
        >
          <select
            id="student-grade"
            disabled={busy}
            aria-invalid={Boolean(errors.gradeApplyingFor)}
            className={cn(pillInputClass, 'cursor-pointer appearance-none pr-2')}
            {...register('gradeApplyingFor')}
          >
            <option value="" disabled>
              {t('home.inquiry.form.gradePlaceholder')}
            </option>
            <option value="Grade 9">{t('home.inquiry.form.grade9')}</option>
            <option value="Grade 10">{t('home.inquiry.form.grade10')}</option>
            <option value="Grade 11">{t('home.inquiry.form.grade11')}</option>
            <option value="Grade 12">{t('home.inquiry.form.grade12')}</option>
          </select>
        </GlassField>

        <GlassField
          icon={<CalendarDays className="h-5 w-5" aria-hidden />}
          {...(errors.academicYear?.message ? { error: errors.academicYear.message } : {})}
        >
          <input
            id="academic-year"
            disabled={busy}
            placeholder={t('home.inquiry.form.academicYear')}
            aria-invalid={Boolean(errors.academicYear)}
            className={pillInputClass}
            {...register('academicYear')}
          />
        </GlassField>

        <div>
          <div
            className={cn(
              'flex items-start gap-3 rounded-3xl border bg-white/80 px-4 py-3 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15',
              errors.message ? 'border-error/60' : 'border-outline-variant/50',
            )}
          >
            <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <textarea
              id="inquiry-message"
              rows={3}
              disabled={busy}
              placeholder={t('home.inquiry.form.messagePlaceholder')}
              aria-invalid={Boolean(errors.message)}
              className="w-full min-w-0 resize-none border-0 bg-transparent font-sans text-base text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none disabled:opacity-60 sm:text-sm"
              {...register('message')}
            />
          </div>
          {errors.message?.message ? (
            <p className="mt-1.5 px-4 font-sans text-caption text-error">
              {errors.message.message}
            </p>
          ) : null}
        </div>

        <div className="px-1 pt-1">
          <Checkbox
            id="newsletter-check"
            label={t('home.inquiry.form.newsletterLabel')}
            description={t('home.inquiry.form.newsletterDescription')}
            disabled={busy}
            {...register('subscribeNewsletter')}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-primary to-brand-evergreen font-sans text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {busy ? t('common.pleaseWait') : t('home.inquiry.form.submit')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={clearForm}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-secondary to-[#c4a35a] font-sans text-sm font-semibold text-on-secondary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {t('register.reset', { defaultValue: 'Reset' })}
          </button>
        </div>

        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

        {admissionMessage ? (
          <FormAlert tone="success">
            <p>{admissionMessage}</p>
            {newsletterFollowUp.status === 'success' ? (
              <p className="mt-2">{newsletterFollowUp.message}</p>
            ) : null}
            {newsletterFollowUp.status === 'success' ? (
              <p className="mt-2">{t('forms.newsletter.confirmHint')}</p>
            ) : null}
            {newsletterFollowUp.status === 'error' ? (
              <p className="mt-2 text-error">{newsletterFollowUp.message}</p>
            ) : null}
          </FormAlert>
        ) : null}
      </form>
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          id="student-name"
          label={t('home.inquiry.form.studentName')}
          required
          error={errors.studentName?.message}
        >
          <Input
            id="student-name"
            autoComplete="name"
            hasError={Boolean(errors.studentName)}
            aria-invalid={Boolean(errors.studentName)}
            disabled={busy}
            {...register('studentName')}
          />
        </FormField>
        <FormField
          id="guardian-name"
          label={t('home.inquiry.form.guardianName')}
          error={errors.guardianName?.message}
        >
          <Input
            id="guardian-name"
            autoComplete="name"
            hasError={Boolean(errors.guardianName)}
            aria-invalid={Boolean(errors.guardianName)}
            disabled={busy}
            {...register('guardianName')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          id="guardian-email"
          label={t('home.inquiry.form.email')}
          required
          error={errors.email?.message}
        >
          <Input
            id="guardian-email"
            type="email"
            autoComplete="email"
            hasError={Boolean(errors.email)}
            aria-invalid={Boolean(errors.email)}
            disabled={busy}
            {...register('email')}
          />
        </FormField>
        <FormField
          id="guardian-phone"
          label={t('home.inquiry.form.phone')}
          required
          error={errors.phone?.message}
        >
          <Input
            id="guardian-phone"
            type="tel"
            autoComplete="tel"
            hasError={Boolean(errors.phone)}
            aria-invalid={Boolean(errors.phone)}
            disabled={busy}
            {...register('phone')}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          id="student-grade"
          label={t('home.inquiry.form.grade')}
          required
          error={errors.gradeApplyingFor?.message}
        >
          <Select
            id="student-grade"
            hasError={Boolean(errors.gradeApplyingFor)}
            aria-invalid={Boolean(errors.gradeApplyingFor)}
            disabled={busy}
            {...register('gradeApplyingFor')}
          >
            <option value="" disabled>
              {t('home.inquiry.form.gradePlaceholder')}
            </option>
            <option value="Grade 9">{t('home.inquiry.form.grade9')}</option>
            <option value="Grade 10">{t('home.inquiry.form.grade10')}</option>
            <option value="Grade 11">{t('home.inquiry.form.grade11')}</option>
            <option value="Grade 12">{t('home.inquiry.form.grade12')}</option>
          </Select>
        </FormField>
        <FormField
          id="academic-year"
          label={t('home.inquiry.form.academicYear')}
          required
          error={errors.academicYear?.message}
        >
          <Input
            id="academic-year"
            hasError={Boolean(errors.academicYear)}
            aria-invalid={Boolean(errors.academicYear)}
            disabled={busy}
            {...register('academicYear')}
          />
        </FormField>
      </div>

      <FormField
        id="inquiry-message"
        label={t('home.inquiry.form.message')}
        required
        error={errors.message?.message}
      >
        <Textarea
          id="inquiry-message"
          rows={4}
          hasError={Boolean(errors.message)}
          aria-invalid={Boolean(errors.message)}
          disabled={busy}
          placeholder={t('home.inquiry.form.messagePlaceholder')}
          {...register('message')}
        />
      </FormField>

      <Checkbox
        id="newsletter-check"
        label={t('home.inquiry.form.newsletterLabel')}
        description={t('home.inquiry.form.newsletterDescription')}
        disabled={busy}
        {...register('subscribeNewsletter')}
      />

      <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
        <span className="text-caption text-on-surface-variant">
          {t('home.inquiry.form.confidentiality')}
        </span>
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={busy}>
          {t('home.inquiry.form.submit')}
        </Button>
      </div>

      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      {admissionMessage ? (
        <FormAlert tone="success">
          <p>{admissionMessage}</p>
          {newsletterFollowUp.status === 'success' ? (
            <p className="mt-2">{newsletterFollowUp.message}</p>
          ) : null}
          {newsletterFollowUp.status === 'success' ? (
            <p className="mt-2">{t('forms.newsletter.confirmHint')}</p>
          ) : null}
          {newsletterFollowUp.status === 'error' ? (
            <p className="mt-2 text-error">{newsletterFollowUp.message}</p>
          ) : null}
        </FormAlert>
      ) : null}
    </form>
  );
}
