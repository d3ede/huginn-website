'use client';
import { Text, useI18n } from '@/components/i18n';

import { useEffect, useState } from 'react';
import { Plus, Copy, Check, LoaderCircle, KeyRound, Trash2 } from 'lucide-react';
import { api, dateTime } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useWorkspace } from '@/components/workspace';
type Key = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};
export default function KeysPage() {
  const { t, locale } = useI18n();

  const { user } = useWorkspace();
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<Key | null>(null);
  async function load() {
    try {
      setKeys((await api<{ keys: Key[] }>('/keys')).keys);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load keys.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ key: string }>('/keys', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name') }),
      });
      setSecret(result.key);
      setModal(false);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create key.');
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (!revoking) return;
    setBusy(true);
    setError('');
    try {
      await api(`/keys/${revoking.id}`, { method: 'DELETE' });
      setRevoking(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to revoke key.');
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setError('Select the key below to copy it manually.');
    }
  }
  return (
    <>
      <header className="workspace-page-heading">
        <div>
          <h1>
            <Text>API Keys</Text>
          </h1>
          <p>
            <Text>Keys never expire. Revoke them here whenever needed.</Text>
          </p>
        </div>
        <button
          className="button button-primary button-small"
          onClick={() => {
            setModal(true);
            setError('');
          }}
        >
          <Plus size={15} />
          <Text> Create key </Text>
        </button>
      </header>
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      {secret && (
        <section className="secret-reveal">
          <div>
            <KeyRound size={18} />
            <h2>
              <Text>Save your new key.</Text>
            </h2>
          </div>
          <p>
            <Text>
              {' '}
              This is the only time the full key is shown. Keep it out of source control and browser
              code.{' '}
            </Text>
          </p>
          <div className="secret-value">
            <input
              aria-label={t('New API key')}
              readOnly
              value={secret}
              onFocus={(e) => e.target.select()}
            />
            <button className="icon-button" onClick={copy} aria-label={t('Copy API key')}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          <button
            className="text-link small"
            onClick={() => {
              setSecret('');
              setCopied(false);
            }}
          >
            <Text> I’ve saved this key → </Text>
          </button>
        </section>
      )}
      <section className="workspace-panel full-panel">
        {keys === null ? (
          <p className="panel-loading">
            <Text>Loading keys…</Text>
          </p>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <KeyRound size={23} strokeWidth={1.2} />
            <h3>
              <Text>Your integration begins with a key.</Text>
            </h3>
            <p>
              <Text>Create your first API key and save it somewhere secure.</Text>
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <Text>Name</Text>
                  </th>
                  <th>
                    <Text>Key</Text>
                  </th>
                  <th>
                    <Text>Created</Text>
                  </th>
                  <th>
                    <Text>Last used</Text>
                  </th>
                  <th>
                    <Text>Status</Text>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="bright">{key.name}</td>
                    <td className="mono">{key.prefix}••••</td>
                    <td>{dateTime(key.createdAt, locale)}</td>
                    <td>
                      <Text>{key.lastUsedAt ? dateTime(key.lastUsedAt, locale) : 'Never'}</Text>
                    </td>
                    <td>
                      <span
                        className={`status ${key.revokedAt ? 'status-failed' : 'status-succeeded'}`}
                      >
                        <i />
                        <Text>{key.revokedAt ? 'Revoked' : 'Active'}</Text>
                      </span>
                    </td>
                    <td>
                      {!key.revokedAt && (
                        <button
                          className="icon-button danger-hover"
                          aria-label={t(`Revoke ${key.name}`)}
                          onClick={() => {
                            setRevoking(key);
                            setError('');
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="below-table-note">
        <Text> Only hashes are stored. Revoking a key immediately disables its access. </Text>
      </p>
      {modal && (
        <Modal onClose={() => setModal(false)} canClose={!busy}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-key-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-heading">
              <h2 id="create-key-title">
                <Text>Create API key</Text>
              </h2>
              <button
                className="icon-button"
                onClick={() => setModal(false)}
                disabled={busy}
                aria-label={t('Close key form')}
              >
                ✕
              </button>
            </div>
            <form onSubmit={create}>
              <label>
                <Text> Key name </Text>
                <input
                  name="name"
                  placeholder={t('e.g. Production application')}
                  required
                  maxLength={80}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  <Text>{error}</Text>
                </p>
              )}
              <button className="button button-primary" disabled={busy}>
                <Text>{busy ? <LoaderCircle className="spin" size={16} /> : 'Generate key'}</Text>
              </button>
            </form>
          </section>
        </Modal>
      )}
      {revoking && (
        <Modal onClose={() => setRevoking(null)} canClose={!busy}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-title"
          >
            <h2 id="revoke-title">
              <Text>Revoke “</Text>
              {revoking.name}
              {locale === 'ru' ? '»?' : '”?'}
            </h2>
            <p>
              <Text>
                {' '}
                Applications using this key will immediately lose API access. This cannot be
                undone.{' '}
              </Text>
            </p>
            {error && (
              <p className="form-error" role="alert">
                <Text>{error}</Text>
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => setRevoking(null)}
              >
                <Text> Keep key </Text>
              </button>
              <button className="button button-danger" disabled={busy} onClick={revoke}>
                <Text>{busy ? 'Revoking…' : 'Revoke key'}</Text>
              </button>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}
