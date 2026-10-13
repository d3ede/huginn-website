'use client';
import { Text, useI18n, LanguageSwitch } from '@/components/i18n';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Brand } from './brand';
import { ThemeSwitch } from './theme';
export function AuthForm({ register = false }: { register?: boolean }) {
  const { t, locale } = useI18n();

  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
          ...(register ? { name: data.get('name') } : {}),
        }),
      });
      router.replace('/app');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to connect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <div className="auth-art" aria-hidden="true" />
      <div className="auth-content">
        <div className="auth-brand-row">
          <Brand />
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
        <div className="auth-form-wrap">
          <h1>
            <Text>{register ? 'Registration' : 'Sign in'}</Text>
          </h1>
          <p>
            <Text>
              {register
                ? 'Register to create API keys and manage tasks.'
                : 'Sign in to your workspace.'}
            </Text>
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                <Text> Name </Text>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder={t('Your name')}
                />
              </label>
            )}
            <label>
              <Text> Email </Text>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder={t('you@company.com')}
              />
            </label>
            <label>
              <Text> Password </Text>
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                placeholder={t(register ? 'At least 8 characters' : 'Your password')}
              />
            </label>
            {register && (
              <p className="field-hint">
                <Text>Use at least 8 characters. Keep this password unique.</Text>
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                <Text>{error}</Text>
              </p>
            )}
            <button disabled={busy} className="button button-primary full-width">
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <>
                  <Text>{register ? 'Create account' : 'Sign in'}</Text>
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>
          </form>
          {register && (
            <p className="auth-terms">
              <Text> By creating an account, you agree to our </Text>
              <Link href="/terms">
                <Text>terms</Text>
              </Link>
              <Text> and</Text>{' '}
              <Link href="/privacy">
                <Text>privacy policy</Text>
              </Link>
              .
            </p>
          )}
          <p className="auth-switch">
            <Text>{register ? 'Already have an account?' : 'New to Huginn?'}</Text>{' '}
            <Link href={register ? '/login' : '/register'}>
              <Text>{register ? 'Sign in' : 'Create an account'}</Text> <ArrowUpRight size={12} />
            </Link>
          </p>
        </div>
        <Link className="auth-back" href="/">
          <Text> ← Back to Huginn </Text>
        </Link>
      </div>
    </main>
  );
}
