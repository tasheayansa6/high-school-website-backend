import type { LanguageCode } from '@/config/languages';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, LANGUAGES } from '@/config/languages';

export const SUPPORTED_LANGUAGES = LANGUAGES.map((item) => item.code);

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === 'en' || value === 'am' || value === 'om';
}

/** Read persisted language preference; invalid values fall back to English. */
export function readStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(stored)) {
      return stored;
    }
  } catch {
    /* ignore storage failures */
  }
  return DEFAULT_LANGUAGE;
}

export function persistLanguage(code: LanguageCode): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    /* ignore storage failures */
  }
}

/** BCP 47 / HTML lang attribute value for the active UI language. */
export function resolveHtmlLang(code: LanguageCode): string {
  return code;
}

export const I18N_NAMESPACES = ['translation'] as const;
