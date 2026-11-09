import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthMethodToggle, type AuthMethod } from '@/components/auth/AuthMethodToggle';
import { PasswordField } from '@/components/auth/PasswordField';
import { SignInShell } from '@/components/auth/SignInShell';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { PUBLIC_ROUTES } from '@/config/routes';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import {
  type StudentLoginFormValues,
  type StudentLoginParsed,
  studentLoginSchema,
} from '@/validation/auth.schema';

export default function StudentLoginPage() {
  const { t } = useTranslation();
  const { login } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    import.meta.env.DEV ? 'email' : 'code',
  );

  const requestedFrom = (location.state as { from?: string } | null)?.from;
  const from =
    typeof requestedFrom === 'string' && requestedFrom.startsWith('/student/')
      ? requestedFrom
      : STUDENT_ROUTES.dashboard;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormValues, unknown, StudentLoginParsed>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      identifier: import.meta.env.DEV ? 'student@example.com' : '',
      password: import.meta.env.DEV ? '' : '',
    },
  });

  const identifierValue = useWatch({ control, name: 'identifier' }) ?? '';

  const detectedLabel = useMemo(() => {
    const trimmed = identifierValue.trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) return t('signin.authMethod.detectedEmail');
    return t('signin.authMethod.detectedStudentCode');
  }, [identifierValue, t]);

  const switchMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    setFormError(null);
    setValue('identifier', '', { shouldValidate: false });
  };

  const onSubmit = handleSubmit(async (credentials) => {
    setFormError(null);

    try {
      await login(credentials);
      void navigate(from, { replace: true });
    } catch (error) {
      const applied = applyApiFieldErrors(error, (field, err) =>
        setError(field === 'password' ? 'password' : 'identifier', err),
      );
      if (!applied) {
        setFormError(getErrorMessage(error, t('signin.errors.generic')));
      }
    }
  });

  const identifierIcon = authMethod === 'code' ? 'fingerprint' : 'mail';

  return (
    <SignInShell step={{ active: 2, total: 2 }}>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-primary">
          {t('signin.loginToAccount', { defaultValue: 'Log in to your account' })}
        </h2>
        <p className="mt-1.5 font-sans text-body-sm text-on-surface-variant">
          {t('signin.credentials.studentSubtitle')}
        </p>
      </div>

      <div className="mb-5">
        <AuthMethodToggle
          value={authMethod}
          onChange={switchMethod}
          disabled={isSubmitting}
        />
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormField
          id="student-identifier"
          label={
            authMethod === 'code'
              ? t('signin.fields.loginCode')
              : t('signin.fields.email')
          }
          required
          error={errors.identifier?.message}
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
              <MaterialIcon name={identifierIcon} className="text-[22px]" />
            </span>
            <Input
              id="student-identifier"
              type={authMethod === 'email' ? 'email' : 'text'}
              autoComplete="username"
              inputMode={authMethod === 'email' ? 'email' : 'text'}
              placeholder={
                authMethod === 'code'
                  ? t('signin.fields.loginCodePlaceholder')
                  : t('signin.fields.emailPlaceholder')
              }
              hasError={Boolean(errors.identifier)}
              aria-invalid={Boolean(errors.identifier)}
              disabled={isSubmitting}
              className="pl-11"
              {...register('identifier')}
            />
          </div>
        </FormField>
        <p className="-mt-2 font-sans text-caption text-on-surface-variant">
          {detectedLabel ??
            (authMethod === 'code'
              ? t('signin.fields.loginCodeHelper')
              : t('signin.fields.studentIdentifierHelper'))}
        </p>

        <FormField
          id="student-password"
          label={t('signin.fields.password')}
          required
          error={errors.password?.message}
        >
          <PasswordField
            id="student-password"
            register={register('password')}
            hasError={Boolean(errors.password)}
            disabled={isSubmitting}
            placeholder={t('signin.fields.passwordPlaceholder')}
            showLeadingLock
          />
        </FormField>

        <div className="rounded-xl border border-secondary-container/60 bg-secondary-container/25 px-3 py-2.5 font-sans text-caption text-on-surface-variant">
          <span className="inline-flex items-start gap-2">
            <MaterialIcon name="key" className="mt-0.5 text-[16px] text-secondary" />
            {t('signin.forgotPassword')}
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-sans text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {isSubmitting ? t('signin.signingIn') : t('signin.signIn')}
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </button>

        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      </form>

      <p className="mt-6 text-center font-sans text-caption text-on-surface-variant">
        {t('signin.switch.otherPrompt')}{' '}
        <Link
          to={PUBLIC_ROUTES.signin}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t('signin.switch.chooseRole')}
        </Link>
        {' · '}
        <Link
          to={TEACHER_ROUTES.login}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {t('signin.roles.teacher.title')}
        </Link>
      </p>
    </SignInShell>
  );
}
