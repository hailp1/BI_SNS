import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';
import ko from './locales/ko.json';

const savedLang = (() => {
  try {
    return localStorage.getItem('cj_lang') || 'vi';
  } catch {
    return 'vi';
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    ko: { translation: ko },
  },
  lng: savedLang,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export function changeAppLanguage(lang: 'vi' | 'en' | 'ko'): void {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem('cj_lang', lang);
  } catch {
    // Ignore storage error
  }
}

export default i18n;
