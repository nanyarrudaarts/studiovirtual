import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}

export function useLanguage() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'pt-BR');

  const change = (l: string) => {
    setLang(l);
    localStorage.setItem('lang', l);
  };

  const label: Record<string, string> = {
    'pt-BR': 'PT',
    'en': 'EN',
    'es': 'ES',
    'de': 'DE',
  };

  return { lang, label: label[lang] || 'PT', change };
}
