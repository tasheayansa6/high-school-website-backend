import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { AuthSplitShell } from '@/components/auth/AuthSplitShell';
import { ASSETS } from '@/config/assets';
import { cn } from '@/lib/utils';

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

export interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  welcomeTitle?: React.ReactNode;
  welcomeSubtitle?: React.ReactNode;
  heroImageSrc?: string;
  /** Kept for API compatibility; unused in the split card layout. */
  testimonials?: Testimonial[];
  showGoogleSignIn?: boolean;
  footerSlot?: React.ReactNode;
  submitLabel?: string;
  emailDefaultValue?: string;
  passwordDefaultValue?: string;
  emailName?: string;
  emailLabel?: string;
  passwordLabel?: string;
  emailPlaceholder?: string;
  passwordPlaceholder?: string;
  rememberLabel?: string;
  resetPasswordLabel?: string;
  createAccountLabel?: string;
  createAccountPrompt?: string;
  googleLabel?: string;
  isSubmitting?: boolean;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

const GlassInputWrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-brand-ivory/70 px-4 transition-colors focus-within:border-primary/50 focus-within:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/15',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * School sign-in UI — Bloomly-style split layout with forest-green accents.
 * Social login is off by default (accounts are provisioned by the school).
 */
export const SignInPage: React.FC<SignInPageProps> = ({
  title = 'Log in to your account',
  description = "We're happy to see you again!",
  welcomeTitle = 'Welcome back!',
  welcomeSubtitle = 'Log in to continue your journey and get things done.',
  heroImageSrc = ASSETS.shapingFuture.src,
  showGoogleSignIn = false,
  footerSlot,
  submitLabel = 'Log in',
  emailDefaultValue,
  passwordDefaultValue,
  emailName = 'email',
  emailLabel = 'Email address',
  passwordLabel = 'Password',
  emailPlaceholder = 'Enter your email',
  passwordPlaceholder = 'Enter your password',
  resetPasswordLabel = 'Forgot your password?',
  createAccountLabel = 'Sign up',
  createAccountPrompt = "Don't have an account?",
  googleLabel = 'Continue with Google',
  isSubmitting = false,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthSplitShell
      welcomeTitle={welcomeTitle}
      welcomeSubtitle={welcomeSubtitle}
      imageSrc={heroImageSrc}
      imageAlt={ASSETS.shapingFuture.alt}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-primary md:text-[1.65rem]">
            {title}
          </h2>
          <p className="mt-1.5 font-sans text-body-sm text-on-surface-variant">{description}</p>
        </div>

        <form className="space-y-4" onSubmit={onSignIn} noValidate>
          <div>
            <label
              htmlFor="signin-email"
              className="mb-1.5 block font-sans text-sm font-medium text-on-surface"
            >
              {emailLabel}
            </label>
            <GlassInputWrapper>
              <Mail className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
              <input
                id="signin-email"
                name={emailName}
                type="email"
                autoComplete="username"
                defaultValue={emailDefaultValue}
                placeholder={emailPlaceholder}
                disabled={isSubmitting}
                className="h-12 w-full min-w-0 bg-transparent font-sans text-base text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none disabled:opacity-60 sm:text-sm"
              />
            </GlassInputWrapper>
          </div>

          <div>
            <label
              htmlFor="signin-password"
              className="mb-1.5 block font-sans text-sm font-medium text-on-surface"
            >
              {passwordLabel}
            </label>
            <GlassInputWrapper>
              <Lock className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
              <input
                id="signin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                defaultValue={passwordDefaultValue}
                placeholder={passwordPlaceholder}
                disabled={isSubmitting}
                className="h-12 w-0 min-w-0 flex-1 bg-transparent font-sans text-base text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none disabled:opacity-60 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </GlassInputWrapper>
          </div>

          {onResetPassword ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onResetPassword}
                className="font-sans text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {resetPasswordLabel}
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            {submitLabel}
          </button>

          {footerSlot}
        </form>

        {showGoogleSignIn ? (
          <>
            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-outline-variant/50" />
              <span className="absolute bg-white px-3 font-sans text-xs text-on-surface-variant">
                or
              </span>
            </div>
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant/60 font-sans text-sm font-medium text-on-surface transition-colors hover:bg-brand-ivory"
            >
              {googleLabel}
            </button>
          </>
        ) : null}

        {onCreateAccount ? (
          <p className="text-center font-sans text-sm text-on-surface-variant">
            {createAccountPrompt}{' '}
            <button
              type="button"
              onClick={onCreateAccount}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {createAccountLabel}
            </button>
          </p>
        ) : null}
      </div>
    </AuthSplitShell>
  );
};
