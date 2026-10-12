'use client';
import { Text } from '@/components/i18n';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">
        <Text>SOMETHING WENT WRONG</Text>
      </span>
      <h1>
        <Text>A brief interruption.</Text>
      </h1>
      <p>
        <Text>Please try loading this page again.</Text>
      </p>
      <button className="button button-primary" onClick={reset}>
        <Text> Try again </Text>
      </button>
    </main>
  );
}
