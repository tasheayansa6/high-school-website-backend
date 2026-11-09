import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { NavigationLink } from '@/components/ui/NavigationLink';
import { MAIN_NAV, type NavItem } from '@/config/navigation';
import { PUBLIC_ROUTES } from '@/config/routes';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { cn } from '@/utils/cn';

function DesktopNavItem({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const hasChildren = Boolean(item.children?.length);

  const clearClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  if (!hasChildren) {
    return (
      <NavigationLink to={item.path} variant="header" {...(item.end ? { end: true } : {})}>
        {t(`nav.${item.labelKey}`)}
      </NavigationLink>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          cn(
            'inline-flex items-center gap-1 font-sans text-[0.95rem] tracking-wide transition-colors',
            isActive || open ? 'font-medium text-secondary' : 'text-on-surface hover:text-secondary',
          )
        }
        aria-expanded={open}
        aria-haspopup="menu"
        onFocus={() => setOpen(true)}
      >
        {t(`nav.${item.labelKey}`)}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </NavLink>
      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-50 min-w-[13rem] pt-3"
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        >
          <ul className="rounded-xl border border-outline-variant/40 bg-white py-2 shadow-md">
            {item.children!.map((child) => (
              <li key={child.path + child.labelKey} role="none">
                <Link
                  role="menuitem"
                  to={child.path}
                  className="block px-4 py-2.5 font-sans text-sm text-on-surface transition-colors hover:bg-brand-ivory hover:text-secondary"
                  onClick={() => setOpen(false)}
                >
                  {t(`nav.${child.labelKey}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const mobileNavId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const closeMobile = () => {
    setIsMobileOpen(false);
    setMobileExpanded(null);
  };

  useBodyScrollLock(isMobileOpen);

  useEffect(() => {
    if (!isMobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const firstLink = mobileNavRef.current?.querySelector('a, button');
    if (firstLink instanceof HTMLElement) firstLink.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen]);

  const goSearch = () => {
    closeMobile();
    void navigate(`${PUBLIC_ROUTES.news}?focus=search`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant/30 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-margin-mobile sm:h-[4.75rem] sm:gap-6 md:px-margin">
        <NavLink
          to="/"
          className="flex min-w-0 shrink items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-3"
          onClick={closeMobile}
          end
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary font-display text-lg font-bold text-secondary"
            aria-hidden
          >
            A
          </span>
          <span className="min-w-0">
            <span className="block max-w-[10rem] truncate font-display text-base leading-tight tracking-tight text-primary sm:max-w-none sm:text-lg">
              {t('common.siteName')}
            </span>
          </span>
        </NavLink>

        <nav
          className="hidden flex-1 items-center justify-center gap-6 xl:gap-9 lg:flex"
          aria-label={t('nav.primary')}
        >
          {MAIN_NAV.map((item) => (
            <DesktopNavItem key={item.labelKey} item={item} />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={goSearch}
            className="inline-flex h-11 w-11 items-center justify-center text-on-surface transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            aria-label={t('nav.search', { defaultValue: 'Search news' })}
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-on-surface transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary lg:hidden"
            aria-label={isMobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={isMobileOpen}
            aria-controls={mobileNavId}
            onClick={() => setIsMobileOpen((open) => !open)}
          >
            <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
              {isMobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 bg-brand-evergreen/25 sm:top-[calc(4.75rem+env(safe-area-inset-top))] lg:hidden"
          aria-label={t('nav.closeMenu')}
          onClick={closeMobile}
        />
      ) : null}

      <div
        ref={mobileNavRef}
        id={mobileNavId}
        className={cn(
          'relative z-50 max-h-[min(70dvh,32rem)] overflow-y-auto border-t border-outline-variant/40 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden',
          !isMobileOpen && 'hidden',
        )}
      >
        <nav className="flex flex-col py-2" aria-label={t('nav.mobilePrimary')}>
          {MAIN_NAV.map((item) => {
            const children = item.children;
            if (!children?.length) {
              return (
                <NavigationLink
                  key={item.labelKey}
                  to={item.path}
                  variant="headerMobile"
                  onClick={closeMobile}
                  {...(item.end ? { end: true } : {})}
                >
                  {t(`nav.${item.labelKey}`)}
                </NavigationLink>
              );
            }

            const expanded = mobileExpanded === item.labelKey;
            return (
              <div key={item.labelKey}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between border-l-2 border-transparent px-5 py-3.5 font-sans text-body-md text-on-surface"
                  aria-expanded={expanded}
                  onClick={() =>
                    setMobileExpanded((current) =>
                      current === item.labelKey ? null : item.labelKey,
                    )
                  }
                >
                  {t(`nav.${item.labelKey}`)}
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                  />
                </button>
                {expanded ? (
                  <ul className="bg-brand-ivory/60 pb-2">
                    {children.map((child) => (
                      <li key={child.labelKey}>
                        <Link
                          to={child.path}
                          className="block min-h-11 py-2.5 pr-5 pl-10 font-sans text-body-sm text-on-surface-variant hover:text-secondary"
                          onClick={closeMobile}
                        >
                          {t(`nav.${child.labelKey}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
