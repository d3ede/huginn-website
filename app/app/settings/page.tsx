'use client';
import { useState } from 'react';
import { LoaderCircle, Check } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { api } from '@/lib/api';
export default function SettingsPage() {
  const { user, refreshUser } = useWorkspace();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState('');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('profile');
    setError('');
    setSuccess('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/account', {
        method: 'PATCH',
        body: JSON.stringify({ name: form.get('name'), timezone: form.get('timezone') }),
      });
      await refreshUser();
      setSuccess('Profile updated.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      setBusy('');
    }
  }
  async function password(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setError('');
    setSuccess('');
    if (form.get('password') !== form.get('confirm')) {
      setError('New passwords do not match.');
      return;
    }
    setBusy('password');
    try {
      await api('/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          password: form.get('password'),
        }),
      });
      element.reset();
      setSuccess('Password updated. Other sessions have been signed out.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <header className="workspace-page-heading">
        <div>
          <span className="eyebrow">ACCOUNT SETTINGS</span>
          <h1>
            The details.
            <br className="mobile-break" /> <em>Made yours.</em>
          </h1>
          <p>Manage your profile and account security.</p>
        </div>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          <Check size={15} />
          {success}
        </p>
      )}
      <section className="settings-section">
        <div>
          <h2>Profile</h2>
          <p>Your account details and preferred timezone.</p>
        </div>
        <form onSubmit={save}>
          <label>
            Name
            <input
              name="name"
              defaultValue={user.name}
              required
              maxLength={80}
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input value={user.email} readOnly type="email" />
          </label>
          <p className="field-hint">Email is your account identifier and cannot be changed here.</p>
          <label>
            Timezone
            <input
              name="timezone"
              defaultValue={user.timezone}
              list="timezones"
              required
              maxLength={100}
            />
            <datalist id="timezones">
              {[
                'UTC',
                'Europe/Tallinn',
                'Europe/London',
                'Europe/Berlin',
                'America/New_York',
                'America/Los_Angeles',
                'Asia/Tokyo',
              ].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <p className="field-hint">
            Table timestamps use this timezone. Statistics use UTC day boundaries.
          </p>
          <button className="button button-outline" disabled={!!busy}>
            {busy === 'profile' ? <LoaderCircle size={16} className="spin" /> : 'Save changes'}
          </button>
        </form>
      </section>
      <section className="settings-section">
        <div>
          <h2>Password</h2>
          <p>Updating your password signs out all other sessions.</p>
        </div>
        <form onSubmit={password}>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="field-hint">At least 12 characters. Use a unique password.</p>
          <button className="button button-outline" disabled={!!busy}>
            {busy === 'password' ? <LoaderCircle size={16} className="spin" /> : 'Update password'}
          </button>
        </form>
      </section>
    </>
  );
}
