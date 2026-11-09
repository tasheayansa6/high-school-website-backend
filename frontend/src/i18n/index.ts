import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '@/config/languages';
import { persistLanguage, readStoredLanguage, resolveHtmlLang } from '@/i18n/config';
import am from '@/i18n/locales/am/translation.json';
import en from '@/i18n/locales/en/translation.json';
import om from '@/i18n/locales/om/translation.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    om: { translation: om },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['en', 'am', 'om'],
  nonExplicitSupportedLngs: false,
  load: 'languageOnly',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

function syncDocumentLanguage(code: string): void {
  if (typeof document === 'undefined') return;
  if (code !== 'en' && code !== 'am' && code !== 'om') return;
  const htmlLang = resolveHtmlLang(code);
  if (document.documentElement.getAttribute('lang') !== htmlLang) {
    document.documentElement.setAttribute('lang', htmlLang);
  }
}

syncDocumentLanguage(i18n.language);

i18n.on('languageChanged', (code) => {
  if (code === 'en' || code === 'am' || code === 'om') {
    persistLanguage(code);
    syncDocumentLanguage(code);
  }
});

export default i18n;
