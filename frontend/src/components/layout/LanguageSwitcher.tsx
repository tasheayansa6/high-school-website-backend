import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type LanguageCode, LANGUAGES } from '@/config/languages';
import { isLanguageCode } from '@/i18n/config';
import { cn } from '@/utils/cn';

/**
 * Shared language selector UI (EN / አማርኛ / Afaan Oromoo).
 * Changes i18next language, persists via i18n languageChanged handler, updates document lang.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const language: LanguageCode = isLanguageCode(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : isLanguageCode(i18n.language)
      ? i18n.language
      : 'en';

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const current = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  const selectLanguage = (code: LanguageCode) => {
    void i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-on-surface transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={t('languages.select')}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
          translate
        </span>
        <span className="hidden font-sans text-label-md sm:inline">
          {t(`languages.${language}`)}
        </span>
        <span
          className="material-symbols-outlined text-[18px] text-on-surface-variant"
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      <div
        id={menuId}
        role="listbox"
        aria-label={t('languages.listLabel')}
        hidden={!isOpen}
        className={cn(
          'absolute right-0 z-[60] mt-2 w-56 rounded-xl border border-outline-variant/40 bg-surface-container-lowest py-2 shadow-md',
          !isOpen && 'hidden',
        )}
      >
        {LANGUAGES.map((option) => {
          const isSelected = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={isSelected}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              onClick={() => selectLanguage(option.code)}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {option.flag}
              </span>
              <span className="flex-1 font-sans text-label-md text-on-surface">
                {t(`languages.${option.code}`)}
              </span>
              <span
                className={cn(
                  'material-symbols-outlined text-[18px] text-primary',
                  !isSelected && 'opacity-0',
                )}
                aria-hidden="true"
              >
                check
              </span>
            </button>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite">
        {current ? t(`languages.${current.code}`) : null}
      </span>
    </div>
  );
}
