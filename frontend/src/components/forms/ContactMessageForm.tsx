import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useSubmitContactMessage } from '@/hooks/useContact';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { type ContactMessageFormValues, contactMessageSchema } from '@/validation/contact.schema';

export function ContactMessageForm() {
  const { t } = useTranslation();
  const contactMutation = useSubmitContactMessage();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactMessageFormValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
  });

  const busy = isSubmitting || contactMutation.isPending;

  const onSubmit = handleSubmit(async (raw) => {
    setSuccessMessage(null);
    setFormError(null);
    const body = contactMessageSchema.parse(raw);

    try {
      const response = await contactMutation.mutateAsync(body);
      setSuccessMessage(response.message);
      reset({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) {
        setFormError(getErrorMessage(error, t('forms.contact.submitFailed')));
      }
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormField
        id="contact-name"
        label={t('contact.form.name')}
        required
        error={errors.name?.message}
      >
        <Input
          id="contact-name"
          autoComplete="name"
          hasError={Boolean(errors.name)}
          aria-invalid={Boolean(errors.name)}
          disabled={busy}
          {...register('name')}
        />
      </FormField>
      <FormField id="contact-phone" label={t('contact.form.phone')} error={errors.phone?.message}>
        <Input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          hasError={Boolean(errors.phone)}
          aria-invalid={Boolean(errors.phone)}
          disabled={busy}
          {...register('phone')}
        />
      </FormField>
      <FormField
        id="contact-email"
        label={t('contact.form.email')}
        required
        error={errors.email?.message}
      >
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          hasError={Boolean(errors.email)}
          aria-invalid={Boolean(errors.email)}
          disabled={busy}
          {...register('email')}
        />
      </FormField>
      <FormField
        id="contact-subject"
        label={t('contact.form.subject')}
        required
        error={errors.subject?.message}
      >
        <Input
          id="contact-subject"
          hasError={Boolean(errors.subject)}
          aria-invalid={Boolean(errors.subject)}
          disabled={busy}
          placeholder={t('contact.form.subjectPlaceholder')}
          {...register('subject')}
        />
      </FormField>
      <FormField
        id="contact-message"
        label={t('contact.form.message')}
        required
        error={errors.message?.message}
      >
        <Textarea
          id="contact-message"
          rows={5}
          hasError={Boolean(errors.message)}
          aria-invalid={Boolean(errors.message)}
          disabled={busy}
          placeholder={t('contact.form.messagePlaceholder')}
          {...register('message')}
        />
      </FormField>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full gap-2"
        isLoading={busy}
        disabled={busy}
      >
        {t('contact.form.submit')}
        {!busy ? <MaterialIcon name="send" className="text-[18px]" /> : null}
      </Button>

      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}
    </form>
  );
}
