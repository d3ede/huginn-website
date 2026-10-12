import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/inter';
import { I18nProvider, Text } from '@/components/i18n';
import { RavenInteraction } from '@/components/raven-interaction';
import { translate } from '@/lib/i18n';
import './globals.css';
import './light.css';
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get('huginn_locale')?.value === 'ru' ? 'ru' : 'en';
  return {
    title: {
      default: translate('Huginn — CAPTCHA solving API', locale),
      template: '%s · Huginn',
    },
    description:
      locale === 'ru'
        ? 'Huginn — API для решения CAPTCHA. hCaptcha для ваших рабочих процессов, задачи и расходы в одном кабинете.'
        : 'A CAPTCHA solving API for your workflows. Start with hCaptcha, manage tasks, API keys and billing with Huginn.',
  };
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await cookies()).get('huginn_locale')?.value === 'ru' ? 'ru' : 'en';
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <I18nProvider initialLocale={locale}>
          <a className="skip-link" href="#main">
            <Text>Skip to content</Text>
          </a>
          {children}
          <RavenInteraction />
        </I18nProvider>
      </body>
    </html>
  );
}
