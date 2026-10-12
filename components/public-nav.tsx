'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Brand } from './brand';
export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Brand />
        <nav className={open ? 'public-links open' : 'public-links'} aria-label="Main navigation">
          <Link onClick={() => setOpen(false)} href="/#product">
            Product
          </Link>
          <Link onClick={() => setOpen(false)} href="/#pricing">
            Pricing
          </Link>
          <Link onClick={() => setOpen(false)} href="/docs">
            Documentation
          </Link>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="sign-in">
            Sign in
          </Link>
          <Link href="/register" className="button button-outline button-small">
            Get started <ArrowUpRight size={14} />
          </Link>
          <button
            className="icon-button menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
