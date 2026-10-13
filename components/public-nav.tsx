'use client';
import { useSession } from './session';
import { Text, useI18n, LanguageSwitch } from '@/components/i18n';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Brand } from './brand';
import { ThemeSwitch } from './theme';
export function PublicNav() {
  const { t, locale } = useI18n();

  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Brand />
        <nav
          className={open ? 'public-links open' : 'public-links'}
          aria-label={t('Main navigation')}
        >
          <Link onClick={() => setOpen(false)} href="/#product">
            <Text> Product </Text>
          </Link>
          <Link onClick={() => setOpen(false)} href="/#pricing">
            <Text> Pricing </Text>
          </Link>
          <Link onClick={() => setOpen(false)} href="/docs">
            <Text> Documentation </Text>
          </Link>
        </nav>
        <div className="nav-actions">
          <ThemeSwitch />
          <LanguageSwitch />
          {loading ? (
            <span className="nav-session-loading" aria-hidden="true" />
          ) : user ? (
            <Link href="/app" className="button button-primary button-small">
              <Text>Open workspace</Text>
              <ArrowUpRight size={14} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="sign-in button button-outline button-small">
                <Text>Sign in</Text>
              </Link>
              <Link href="/register" className="button button-primary button-small">
                <Text>Get started</Text>
                <ArrowUpRight size={14} />
              </Link>
            </>
          )}
          <button
            className="icon-button menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={t(open ? 'Close navigation' : 'Open navigation')}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
