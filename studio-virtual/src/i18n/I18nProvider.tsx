import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import translations, { type Lang, type TranslationKey } from './translations';

interface I18nCtx {
  lang: Lang;
  t: (key: TranslationKey) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nCtx>({
  lang: 'pt-BR',
  t: (k) => k,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'pt-BR';
  });

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const dict = translations[lang] ?? translations['pt-BR'];
    return (dict as Record<string, string>)[key]
      ?? (translations['pt-BR'] as Record<string, string>)[key]
      ?? key;
  }, [lang]);

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18nContext);
