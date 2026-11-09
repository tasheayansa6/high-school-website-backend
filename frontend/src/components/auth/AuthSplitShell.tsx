import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ASSETS } from '@/config/assets';
import { PUBLIC_ROUTES } from '@/config/routes';
import { SITE } from '@/config/site';
import { cn } from '@/lib/utils';

interface AuthSplitShellProps {
  children: ReactNode;
  /** Left-panel headline under the brand. */
  welcomeTitle?: ReactNode;
  welcomeSubtitle?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
}

/**
 * Bloomly-inspired split auth layout — soft ivory frame, student photo left,
 * elevated white form card right. Forest-green brand accents.
 */
export function AuthSplitShell({
  children,
  welcomeTitle = 'Welcome back!',
  welcomeSubtitle = 'Log in to continue your journey and get things done.',
  imageSrc = ASSETS.shapingFuture.src,
  imageAlt = ASSETS.shapingFuture.alt,
  className,
}: AuthSplitShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-[100dvh] w-full items-center justify-center overflow-x-clip bg-brand-ivory px-3 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-8 md:px-8',
        className,
      )}
    >
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[1.5rem] bg-surface-container-low shadow-md sm:rounded-[2rem] md:min-h-[38rem] md:grid-cols-2">
        {/* Left — branding + photo (compact banner on phones, full panel on desktop) */}
        <aside className="relative flex min-h-[11rem] flex-col justify-between overflow-hidden bg-primary-container p-5 text-on-primary sm:min-h-[14rem] sm:p-8 md:min-h-0 md:p-10">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            decoding="async"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-brand-evergreen/95 via-brand-evergreen/55 to-brand-evergreen/25"
            aria-hidden
          />

          <div className="relative z-10">
            <Link to={PUBLIC_ROUTES.home} className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-secondary-fixed ring-1 ring-white/25">
                A
              </span>
              <span className="font-sans text-sm font-semibold tracking-wide text-white">
                {SITE.name}
              </span>
            </Link>
          </div>

          <div className="relative z-10 mt-6 max-w-sm sm:mt-10 md:mt-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              {welcomeTitle}
            </h1>
            <p className="mt-2 hidden font-sans text-body-md font-light leading-relaxed text-white/85 sm:mt-3 sm:block">
              {welcomeSubtitle}
            </p>
          </div>
        </aside>

        {/* Right — elevated form card */}
        <section className="flex items-center justify-center bg-brand-ivory/80 p-4 sm:p-6 md:p-10">
          <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-md sm:rounded-3xl sm:p-7 md:p-9">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
