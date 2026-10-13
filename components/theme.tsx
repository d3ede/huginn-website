'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from './i18n';

export type Theme = 'light' | 'dark';
const ThemeContext = createContext({ theme: 'light' as Theme, toggle: () => {} });

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setTheme] = useState(initialTheme);
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.cookie = `huginn_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setTheme(next);
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitch() {
  const { theme, toggle } = useContext(ThemeContext);
  const { locale } = useI18n();
  const label =
    locale === 'ru'
      ? theme === 'light'
        ? 'Включить тёмную тему'
        : 'Включить светлую тему'
      : theme === 'light'
        ? 'Switch to dark theme'
        : 'Switch to light theme';
  return (
    <button
      type="button"
      className="theme-switch"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
