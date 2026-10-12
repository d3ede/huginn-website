'use client';
import { Text } from '@/components/i18n';

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
        body: JSON.stringify({ name: form.get('name') }),
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
          <h1>
            <Text>Settings</Text>
          </h1>
          <p>
            <Text>Manage your profile and account security.</Text>
          </p>
        </div>
      </header>
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          <Check size={15} />
          <Text>{success}</Text>
        </p>
      )}
      <section className="settings-section">
        <div>
          <h2>
            <Text>Profile</Text>
          </h2>
          <p>
            <Text>Your account details.</Text>
          </p>
        </div>
        <form onSubmit={save}>
          <label>
            <Text> Name </Text>
            <input
              name="name"
              defaultValue={user.name}
              required
              maxLength={80}
              autoComplete="name"
            />
          </label>
          <label>
            <Text> Email </Text>
            <input value={user.email} readOnly type="email" />
          </label>
          <p className="field-hint">
            <Text>Email is your account identifier and cannot be changed here.</Text>
          </p>
          <button className="button button-outline" disabled={!!busy}>
            <Text>
              {busy === 'profile' ? <LoaderCircle size={16} className="spin" /> : 'Save changes'}
            </Text>
          </button>
        </form>
      </section>
      <section className="settings-section">
        <div>
          <h2>
            <Text>Password</Text>
          </h2>
          <p>
            <Text>Updating your password signs out all other sessions.</Text>
          </p>
        </div>
        <form onSubmit={password}>
          <label>
            <Text> Current password </Text>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            <Text> New password </Text>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <label>
            <Text> Confirm new password </Text>
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <p className="field-hint">
            <Text>At least 8 characters. Use a unique password.</Text>
          </p>
          <button className="button button-outline" disabled={!!busy}>
            <Text>
              {busy === 'password' ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                'Update password'
              )}
            </Text>
          </button>
        </form>
      </section>
    </>
  );
}
