import Link from 'next/link';
import { Brand } from './brand';
import { ArrowUpRight } from 'lucide-react';
export function Footer() {
  return (
    <footer className="footer container">
      <Brand />
      <span>© {new Date().getFullYear()} Huginn</span>
      <nav aria-label="Footer">
        <Link href="/docs">
          Documentation <ArrowUpRight size={12} />
        </Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
