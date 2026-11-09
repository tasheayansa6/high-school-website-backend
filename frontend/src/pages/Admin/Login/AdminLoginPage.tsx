import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { FormAlert } from '@/components/forms/FormAlert';
import { SignInPage } from '@/components/ui/sign-in';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/apiMessage';
import { adminLoginSchema } from '@/validation/auth.schema';

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : ADMIN_ROUTES.dashboard;

  const onSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    try {
      const credentials = adminLoginSchema.parse(raw);
      await login(credentials);
      void navigate(from.startsWith('/admin') ? from : ADMIN_ROUTES.dashboard, {
        replace: true,
      });
    } catch (error) {
      setFormError(getErrorMessage(error, t('signin.errors.generic')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SignInPage
      title={t('signin.loginToAccount', { defaultValue: 'Log in to your account' })}
      description={t('signin.credentials.adminSubtitle')}
      welcomeTitle={t('signin.welcomeBack')}
      welcomeSubtitle={t('signin.welcomeSubtitle', {
        defaultValue: 'Log in to continue your journey and get things done.',
      })}
      heroImageSrc={ASSETS.admissionsSide.src}
      showGoogleSignIn={false}
      isSubmitting={isSubmitting}
      submitLabel={isSubmitting ? t('signin.signingIn') : t('signin.signIn')}
      emailLabel={t('signin.fields.email')}
      passwordLabel={t('signin.fields.password')}
      emailPlaceholder={t('signin.fields.emailPlaceholder')}
      passwordPlaceholder={t('signin.fields.passwordPlaceholder')}
      {...(import.meta.env.DEV ? { emailDefaultValue: 'admin@example.com' } : {})}
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
      {...(formError ? { footerSlot: <FormAlert tone="error">{formError}</FormAlert> } : {})}
    />
  );
}
