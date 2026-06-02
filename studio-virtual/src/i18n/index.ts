import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './pt';
import en from './en';
import es from './es';
import de from './de';

i18n.use(initReactI18next).init({
  lng: localStorage.getItem('language') || 'pt',
  fallbackLng: 'pt',
  resources: {
    pt: pt,
    en: en,
    es: es,
    de: de,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
