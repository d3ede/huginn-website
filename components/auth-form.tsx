'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Brand } from './brand';
export function AuthForm({ register = false }: { register?: boolean }) {
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
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-copy">
          <span className="eyebrow">OBSERVE. ADAPT. AUTOMATE.</span>
          <h2>
            Thoughtfully built.
            <br />
            <em>Quietly capable.</em>
          </h2>
        </div>
      </div>
      <div className="auth-content">
        <Brand />
        <div className="auth-form-wrap">
          <span className="eyebrow">YOUR HUGINN WORKSPACE</span>
          <h1>{register ? 'See further.' : 'Welcome back.'}</h1>
          <p>
            {register
              ? 'Create an account. Build with a clearer view.'
              : 'Sign in to your workspace.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="Your name"
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 12 : 1}
                maxLength={128}
                placeholder={register ? 'At least 12 characters' : 'Your password'}
              />
            </label>
            {register && (
              <p className="field-hint">Use at least 12 characters. Keep this password unique.</p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button disabled={busy} className="button button-primary full-width">
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <>
                  {register ? 'Create account' : 'Sign in'}
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>
          </form>
          {register && (
            <p className="auth-terms">
              By creating an account, you agree to our <Link href="/terms">terms</Link> and{' '}
              <Link href="/privacy">privacy policy</Link>.
            </p>
          )}
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Huginn?'}{' '}
            <Link href={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'} <ArrowUpRight size={12} />
            </Link>
          </p>
        </div>
        <Link className="auth-back" href="/">
          ← Back to Huginn
        </Link>
      </div>
    </main>
  );
}
