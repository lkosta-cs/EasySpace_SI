import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import rs from './locales/rs.json';

// Read the persisted language from localStorage so the first render
// already uses the correct language without a flash.
let savedLang = 'en';
try {
  const stored = localStorage.getItem('language-storage');
  if (stored) {
    savedLang = JSON.parse(stored)?.state?.language ?? 'en';
  }
} catch {
  // localStorage unavailable — fall back to English
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rs: { translation: rs },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
