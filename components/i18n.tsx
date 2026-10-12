'use client';
import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { translate, russian, type Locale } from '@/lib/i18n';

type I18n = { locale: Locale; t: (text: string) => string; setLocale: (locale: Locale) => void };
const Context = createContext<I18n>({ locale: 'en', t: (text) => text, setLocale: () => {} });
export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const router = useRouter();
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    const sourceTitle = document.title.split(' · Huginn')[0];
    const english =
      Object.entries(russian).find(([, value]) => value === sourceTitle)?.[0] ?? sourceTitle;
    document.title =
      translate(english, locale) + (document.title.endsWith(' · Huginn') ? ' · Huginn' : '');
  }, [locale]);
  const value = useMemo<I18n>(
    () => ({
      locale,
      t: (text) => translate(text, locale),
      setLocale: (next) => {
        updateLocale(next);
        document.documentElement.lang = next;
        document.cookie = `huginn_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        router.refresh();
      },
    }),
    [locale, router],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);
export function Text({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const source =
    Array.isArray(children) &&
    children.every((child) => typeof child === 'string' || typeof child === 'number')
      ? children.join('')
      : children;
  return <>{typeof source === 'string' ? t(source) : source}</>;
}
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      type="button"
      className="language-switch"
      onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
      aria-label={locale === 'en' ? 'Переключить на русский' : 'Switch to English'}
      title={locale === 'en' ? 'Русский' : 'English'}
    >
      <Languages size={17} />
      <span>{locale === 'en' ? 'RU' : 'EN'}</span>
    </button>
  );
}
