import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { FormAlert } from '@/components/forms/FormAlert';
import { SignInPage } from '@/components/ui/sign-in';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import { STUDENT_ROUTES } from '@/config/studentRoutes';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { getErrorMessage } from '@/utils/apiMessage';
import { studentLoginSchema } from '@/validation/auth.schema';

/**
 * Public Login — direct email/password form (Bloomly-style).
 * Defaults to student portal; teacher link sits under the form.
 */
export default function SignInIdentifyPage() {
  const { t } = useTranslation();
  const { login } = useStudentAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw = {
      identifier: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    try {
      const credentials = studentLoginSchema.parse(raw);
      await login(credentials);
      void navigate(STUDENT_ROUTES.dashboard, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, t('signin.errors.generic')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SignInPage
      title={t('signin.loginToAccount', { defaultValue: 'Log in to your account' })}
      description={t('signin.happyToSeeYou', {
        defaultValue: "We're happy to see you again!",
      })}
      welcomeTitle={t('signin.welcomeBack')}
      welcomeSubtitle={t('signin.welcomeSubtitle', {
        defaultValue: 'Log in to continue your journey and get things done.',
      })}
      heroImageSrc={ASSETS.shapingFuture.src}
      showGoogleSignIn={false}
      isSubmitting={isSubmitting}
      submitLabel={isSubmitting ? t('signin.signingIn') : t('signin.signIn')}
      emailLabel={t('signin.fields.email')}
      passwordLabel={t('signin.fields.password')}
      emailPlaceholder={t('signin.fields.emailPlaceholder')}
      passwordPlaceholder={t('signin.fields.passwordPlaceholder')}
      {...(import.meta.env.DEV ? { emailDefaultValue: 'student@example.com' } : {})}
      resetPasswordLabel={t('signin.resetPassword', { defaultValue: 'Forgot your password?' })}
      createAccountPrompt={t('signin.admissionsPrompt', {
        defaultValue: "Don't have an account?",
      })}
      createAccountLabel={t('nav.admission')}
      onSignIn={(e) => {
        void onSignIn(e);
      }}
      onResetPassword={() => {
        setFormError(t('signin.forgotPassword'));
      }}
      onCreateAccount={() => {
        void navigate(PUBLIC_ROUTES.register);
      }}
      footerSlot={
        <div className="space-y-3">
          {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
          <p className="text-center font-sans text-caption text-on-surface-variant">
            <button
              type="button"
              onClick={() => void navigate(TEACHER_ROUTES.login)}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('signin.roles.teacher.title')}
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => void navigate(STUDENT_ROUTES.login)}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('signin.studentCodeLogin', { defaultValue: 'Student code' })}
            </button>
          </p>
        </div>
      }
    />
  );
}
