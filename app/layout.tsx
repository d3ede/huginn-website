import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Huginn — Solve what others can’t.', template: '%s · Huginn' },
  description:
    'Developer-first hCaptcha solving infrastructure. A clear API, controlled spending, and a quieter workflow.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
