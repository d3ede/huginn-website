import { cookies } from 'next/headers';
import { translate } from './i18n';
export async function localizedTitle(title: string) {
  const locale = (await cookies()).get('huginn_locale')?.value === 'ru' ? 'ru' : 'en';
  return { title: translate(title, locale) };
}
