import { Text } from '@/components/i18n';
import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <Brand />
      <span className="eyebrow">404</span>
      <h1>
        <Text>Page not found.</Text>
      </h1>
      <Link href="/" className="button button-primary">
        <Text> Back to Huginn → </Text>
      </Link>
    </main>
  );
}
