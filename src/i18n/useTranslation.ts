import translations, { type Lang, type TranslationKey } from './translations';

export function getCurrentLang(): Lang {
  return (localStorage.getItem('lang') as Lang) || 'pt-BR';
}

export function useTranslation() {
  const lang = getCurrentLang();
  const dict = translations[lang] ?? translations['pt-BR'];

  const t = (key: TranslationKey): string => {
    return (dict as Record<string, string>)[key] ?? (translations['pt-BR'] as Record<string, string>)[key] ?? key;
  };

  return { t, lang };
}
