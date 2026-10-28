import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import arTranslation from '../public/locales/ar/translation.json';
import enTranslation from '../public/locales/en/translation.json';

const resources = {
  ar: {
    translation: arTranslation,
  },
  en: {
    translation: enTranslation,
  },
};

const updateDocumentAttributes = (lng) => {
  const currentLang = lng || 'ar';
  const isArabic = currentLang.startsWith('ar');
  const dir = isArabic ? 'rtl' : 'ltr';
  const lang = isArabic ? 'ar' : 'en';

  if (typeof document !== 'undefined') {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'foodx_lng',
      lookupCookie: 'foodx_lng',
    },
  });

// Set attributes on initial load
updateDocumentAttributes(i18n.language);

// Update attributes dynamically when language switches
i18n.on('languageChanged', (lng) => {
  updateDocumentAttributes(lng);
});

export default i18n;
