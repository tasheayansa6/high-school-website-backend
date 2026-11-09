export type LanguageCode = 'en' | 'am' | 'om';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromoo', flag: '🇪🇹' },
] as const;

export const LANGUAGE_STORAGE_KEY = 'aa_lang';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
