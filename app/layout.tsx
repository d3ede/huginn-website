import { SessionProvider } from '@/components/session';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/inter';
import { I18nProvider, Text } from '@/components/i18n';
import { RavenInteraction } from '@/components/raven-interaction';
import { ThemeProvider } from '@/components/theme';
import { translate } from '@/lib/i18n';
import './globals.css';
import './light.css';
import './themes.css';
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get('huginn_locale')?.value === 'ru' ? 'ru' : 'en';
  return {
    title: {
      default: translate('Huginn — hCaptcha API', locale),
      template: '%s · Huginn',
    },
    description:
      locale === 'ru'
        ? 'API для решения hCaptcha. Задачи, результаты и учёт расходов в личном кабинете.'
        : 'An API for solving hCaptcha. Tasks, results and billing in your account.',
  };
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferences = await cookies();
  const locale = preferences.get('huginn_locale')?.value === 'ru' ? 'ru' : 'en';
  const theme = preferences.get('huginn_theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang={locale} data-theme={theme} data-scroll-behavior="smooth">
      <body>
        <I18nProvider initialLocale={locale}>
          <ThemeProvider initialTheme={theme}>
            <a className="skip-link" href="#main">
              <Text>Skip to content</Text>
            </a>
            <SessionProvider>{children}</SessionProvider>
            <RavenInteraction />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
