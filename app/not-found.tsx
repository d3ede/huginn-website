import { Text } from '@/components/i18n';
import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <Brand />
      <span className="eyebrow">
        <Text>404 / OUT OF SIGHT</Text>
      </span>
      <h1>
        <Text> Nothing here. </Text>
        <br />
        <em>
          <Text>Look a little further.</Text>
        </em>
      </h1>
      <Link href="/" className="button button-primary">
        <Text> Back to Huginn → </Text>
      </Link>
    </main>
  );
}
