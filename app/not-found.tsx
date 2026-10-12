import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <Brand />
      <span className="eyebrow">404 / OUT OF SIGHT</span>
      <h1>
        Nothing here.
        <br />
        <em>Look a little further.</em>
      </h1>
      <Link href="/" className="button button-primary">
        Back to Huginn →
      </Link>
    </main>
  );
}
