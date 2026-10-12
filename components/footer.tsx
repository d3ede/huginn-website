'use client';
import { Text, useI18n } from '@/components/i18n';
import Link from 'next/link';
import { Brand } from './brand';
import { ArrowUpRight } from 'lucide-react';
export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer container">
      <Brand />
      <span>
        © {new Date().getFullYear()}
        <Text> Huginn</Text>
      </span>
      <nav aria-label={t('Footer')}>
        <Link href="/docs">
          <Text> Documentation </Text>
          <ArrowUpRight size={12} />
        </Link>
        <Link href="/privacy">
          <Text>Privacy</Text>
        </Link>
        <Link href="/terms">
          <Text>Terms</Text>
        </Link>
      </nav>
    </footer>
  );
}
