'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">SOMETHING WENT WRONG</span>
      <h1>A brief interruption.</h1>
      <p>Please try loading this page again.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
