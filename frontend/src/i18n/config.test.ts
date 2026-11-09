import { beforeEach, describe, expect, it } from 'vitest';

import { LANGUAGE_STORAGE_KEY } from '@/config/languages';
import {
  isLanguageCode,
  persistLanguage,
  readStoredLanguage,
  resolveHtmlLang,
} from '@/i18n/config';

describe('i18n config helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates supported language codes', () => {
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('am')).toBe(true);
    expect(isLanguageCode('om')).toBe(true);
    expect(isLanguageCode('fr')).toBe(false);
  });

  it('persists and reads the selected language', () => {
    persistLanguage('om');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('om');
    expect(readStoredLanguage()).toBe('om');
  });

  it('falls back to English for invalid stored values', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx');
    expect(readStoredLanguage()).toBe('en');
  });

  it('maps language codes for the html lang attribute', () => {
    expect(resolveHtmlLang('am')).toBe('am');
  });
});
