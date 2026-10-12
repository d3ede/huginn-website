'use client';
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
          <span className="eyebrow">DEVELOPER ACCESS</span>
          <h1>
            Your keys.
            <br className="mobile-break" /> <em>Your control.</em>
          </h1>
          <p>A separate key for every integration.</p>
        </div>
        <button
          className="button button-primary button-small"
          onClick={() => {
            setModal(true);
            setError('');
          }}
        >
          <Plus size={15} /> Create key
        </button>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {secret && (
        <section className="secret-reveal">
          <div>
            <KeyRound size={18} />
            <h2>Save your new key.</h2>
          </div>
          <p>
            This is the only time the full key is shown. Keep it out of source control and browser
            code.
          </p>
          <div className="secret-value">
            <input
              aria-label="New API key"
              readOnly
              value={secret}
              onFocus={(e) => e.target.select()}
            />
            <button className="icon-button" onClick={copy} aria-label="Copy API key">
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
            I’ve saved this key →
          </button>
        </section>
      )}
      <section className="workspace-panel full-panel">
        {keys === null ? (
          <p className="panel-loading">Loading keys…</p>
        ) : keys.length === 0 ? (
          <div className="empty-state">
            <KeyRound size={23} strokeWidth={1.2} />
            <h3>Your integration begins with a key.</h3>
            <p>Create your first API key and save it somewhere secure.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="bright">{key.name}</td>
                    <td className="mono">{key.prefix}••••</td>
                    <td>{dateTime(key.createdAt, user.timezone)}</td>
                    <td>{key.lastUsedAt ? dateTime(key.lastUsedAt, user.timezone) : 'Never'}</td>
                    <td>
                      <span
                        className={`status ${key.revokedAt ? 'status-failed' : 'status-succeeded'}`}
                      >
                        <i />
                        {key.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      {!key.revokedAt && (
                        <button
                          className="icon-button danger-hover"
                          aria-label={`Revoke ${key.name}`}
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
        Only hashes are stored. Revoking a key immediately disables its access.
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
              <h2 id="create-key-title">Create API key</h2>
              <button
                className="icon-button"
                onClick={() => setModal(false)}
                disabled={busy}
                aria-label="Close key form"
              >
                ✕
              </button>
            </div>
            <form onSubmit={create}>
              <label>
                Key name
                <input
                  name="name"
                  placeholder="e.g. Production application"
                  required
                  maxLength={80}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-primary" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={16} /> : 'Generate key'}
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
            <h2 id="revoke-title">Revoke “{revoking.name}”?</h2>
            <p>
              Applications using this key will immediately lose API access. This cannot be undone.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => setRevoking(null)}
              >
                Keep key
              </button>
              <button className="button button-danger" disabled={busy} onClick={revoke}>
                {busy ? 'Revoking…' : 'Revoke key'}
              </button>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}
